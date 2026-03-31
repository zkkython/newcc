import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import type { SessionManager } from './sessionManager.js'
import type { ServerLogger } from './serverLog.js'
import type { ServerConfig } from './types.js'

type StartedServer = {
  port?: number
  stop: (force?: boolean) => void
}

function unauthorized(res: ServerResponse): void {
  res.statusCode = 401
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ error: 'Unauthorized' }))
}

function json(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, any>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw) as Record<string, any>
}

function isAuthorized(req: IncomingMessage, authToken: string): boolean {
  const auth = req.headers.authorization
  return auth === `Bearer ${authToken}`
}

export function startServer(
  config: ServerConfig,
  sessionManager: SessionManager,
  logger: ServerLogger,
): StartedServer {
  const server = createServer(async (req, res) => {
    const method = req.method ?? 'GET'
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true })
      return
    }

    if (!isAuthorized(req, config.authToken)) {
      unauthorized(res)
      return
    }

    if (method === 'POST' && url.pathname === '/sessions') {
      try {
        const body = await readJsonBody(req)
        const cwd =
          typeof body.cwd === 'string' && body.cwd.trim()
            ? body.cwd
            : config.workspace ?? process.cwd()
        const session = await sessionManager.createSession({ cwd })
        const host = config.host === '0.0.0.0' ? '127.0.0.1' : config.host
        const port =
          (server.address() &&
          typeof server.address() === 'object' &&
          server.address()
            ? server.address().port
            : undefined) ?? config.port
        json(res, 200, {
          session_id: session.id,
          ws_url: `ws://${host}:${port}/sessions/${session.id}/ws`,
          work_dir: session.workDir,
        })
      } catch (err) {
        logger.error(
          err instanceof Error ? err.message : 'Failed to create session',
        )
        json(res, 500, { error: 'Failed to create session' })
      }
      return
    }

    json(res, 404, { error: 'Not found' })
  })

  if (config.unix) {
    server.listen(config.unix, () => {
      logger.info(`Server listening on unix socket ${config.unix}`)
    })
  } else {
    server.listen(config.port, config.host, () => {
      logger.info(`Server listening on http://${config.host}:${config.port}`)
    })
  }

  const addr = server.address()
  const port =
    addr && typeof addr === 'object' && 'port' in addr ? addr.port : undefined

  return {
    port,
    stop(force?: boolean): void {
      if (force) {
        void sessionManager.destroyAll()
      }
      server.close()
    },
  }
}
