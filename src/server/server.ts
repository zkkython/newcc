import { randomUUID } from 'crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { SessionManager } from './sessionManager.js'
import type { ServerLogger } from './serverLog.js'
import type { ServerConfig } from './types.js'
import { WebSocketServer, type WebSocket } from 'ws'

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
  if (auth === `Bearer ${authToken}`) {
    return true
  }
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const token =
      url.searchParams.get('token') ?? url.searchParams.get('authToken')
    return token === authToken
  } catch {
    return false
  }
}

export function startServer(
  config: ServerConfig,
  sessionManager: SessionManager,
  logger: ServerLogger,
): StartedServer {
  const wss = new WebSocketServer({ noServer: true })
  const WS_OPEN = 1

  const writeWsJson = (ws: WebSocket, message: SDKMessage): void => {
    if (ws.readyState !== WS_OPEN) return
    ws.send(`${JSON.stringify(message)}\n`)
  }

  const writeWsExecutionError = (
    ws: WebSocket,
    sessionId: string,
    text: string,
  ): void => {
    writeWsJson(ws, {
      type: 'result',
      subtype: 'error_during_execution',
      uuid: randomUUID(),
      duration_ms: 0,
      duration_api_ms: 0,
      is_error: true,
      num_turns: 1,
      session_id: sessionId,
      total_cost_usd: 0,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
      result: text,
    } as SDKMessage)
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const sessionId = url.pathname.split('/')[2]
    if (!sessionId) {
      ws.close(1002, 'Missing session id')
      return
    }
    if (!sessionManager.getSession(sessionId)) {
      ws.close(4001, 'Session not found')
      return
    }

    writeWsJson(ws, {
      type: 'system',
      subtype: 'init',
      uuid: randomUUID(),
      model: 'claude-reconstructed-direct-connect',
      cwd: sessionManager.getSession(sessionId)?.workDir ?? process.cwd(),
      permission_mode: 'default',
    } as SDKMessage)

    let processingChain: Promise<void> = Promise.resolve()
    const keepAliveTimer = setInterval(() => {
      writeWsJson(ws, {
        type: 'keep_alive',
      } as SDKMessage)
    }, 25_000)

    ws.on('close', () => {
      clearInterval(keepAliveTimer)
    })

    const processUserPrompt = async (prompt: unknown): Promise<void> => {
      try {
        const out = await sessionManager.submitPrompt(sessionId, prompt)
        for (const responseMessage of out) {
          writeWsJson(ws, responseMessage)
        }
      } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error))
        writeWsExecutionError(
          ws,
          sessionId,
          error instanceof Error ? error.message : 'Failed to process message',
        )
      }
    }

    const enqueuePrompt = (prompt: unknown): void => {
      processingChain = processingChain
        .then(() => processUserPrompt(prompt))
        .catch(error => {
          logger.error(error instanceof Error ? error.message : String(error))
        })
    }

    ws.on('message', async rawData => {
      const data =
        typeof rawData === 'string' ? rawData : rawData.toString('utf8')
      const lines = data.split('\n').filter(line => line.trim().length > 0)
      for (const line of lines) {
        let parsed: unknown
        try {
          parsed = JSON.parse(line)
        } catch {
          writeWsExecutionError(ws, sessionId, 'Invalid JSON input message')
          continue
        }
        const msg = parsed as {
          type?: unknown
          request_id?: unknown
          request?: { subtype?: unknown } | unknown
          message?: { content?: unknown } | unknown
          content?: unknown
        }
        if (msg.type === 'keep_alive') {
          continue
        }
        if (msg.type === 'control_request') {
          const requestId =
            typeof msg.request_id === 'string' ? msg.request_id : randomUUID()
          const subtype =
            typeof msg.request === 'object' && msg.request
              ? (msg.request as { subtype?: unknown }).subtype
              : undefined
          if (subtype === 'interrupt') {
            writeWsJson(ws, {
              type: 'control_response',
              response: {
                subtype: 'success',
                request_id: requestId,
                response: {
                  interrupted: true,
                },
              },
            } as SDKMessage)
          } else {
            writeWsJson(ws, {
              type: 'control_response',
              response: {
                subtype: 'error',
                request_id: requestId,
                error: `Unsupported control request subtype: ${String(subtype ?? 'unknown')}`,
              },
            } as SDKMessage)
          }
          continue
        }
        if (msg.type !== 'user') {
          continue
        }
        const prompt =
          (typeof msg.message === 'object' && msg.message
            ? (msg.message as { content?: unknown }).content
            : undefined) ??
          msg.content ??
          msg.message
        enqueuePrompt(prompt)
      }
    })
  })

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
        const wsBase = config.unix
          ? 'ws://127.0.0.1'
          : `ws://${host}:${port}`
        json(res, 200, {
          session_id: session.id,
          ws_url: `${wsBase}/sessions/${session.id}/ws`,
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

    if (method === 'POST' && url.pathname.match(/^\/sessions\/[^/]+\/messages$/)) {
      try {
        const sessionId = url.pathname.split('/')[2]
        if (!sessionId) {
          json(res, 400, { error: 'Missing session id' })
          return
        }
        const body = await readJsonBody(req)
        const prompt =
          body.prompt ?? body.message?.content ?? body.content ?? body.message
        const messages = await sessionManager.submitPrompt(sessionId, prompt)
        json(res, 200, { messages })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to submit message'
        logger.error(message)
        if (message.startsWith('Unknown session:')) {
          json(res, 404, { error: message })
        } else {
          json(res, 500, { error: message })
        }
      }
      return
    }

    if (method === 'GET' && url.pathname.match(/^\/sessions\/[^/]+\/messages$/)) {
      try {
        const sessionId = url.pathname.split('/')[2]
        if (!sessionId) {
          json(res, 400, { error: 'Missing session id' })
          return
        }
        const messages = sessionManager.listSessionMessages(sessionId)
        json(res, 200, { messages })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to list messages'
        logger.error(message)
        json(res, 500, { error: message })
      }
      return
    }

    json(res, 404, { error: 'Not found' })
  })

  server.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      const isSessionWs = /^\/sessions\/[^/]+\/ws$/.test(url.pathname)
      if (!isSessionWs) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
        socket.destroy()
        return
      }
      if (!isAuthorized(req, config.authToken)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      wss.handleUpgrade(req, socket, head, ws => {
        wss.emit('connection', ws, req)
      })
    } catch {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
    }
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
      wss.clients.forEach(client => {
        client.close()
      })
      wss.close()
      server.close()
    },
  }
}
