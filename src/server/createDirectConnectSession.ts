/* eslint-disable eslint-plugin-n/no-unsupported-features/node-builtins */

import { request } from 'http'
import { errorMessage } from '../utils/errors.js'
import { jsonStringify } from '../utils/slowOperations.js'
import type { DirectConnectConfig } from './directConnectManager.js'
import { connectResponseSchema } from './types.js'

/**
 * Errors thrown by createDirectConnectSession when the connection fails.
 */
export class DirectConnectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DirectConnectError'
  }
}

/**
 * Create a session on a direct-connect server.
 *
 * Posts to `${serverUrl}/sessions`, validates the response, and returns
 * a DirectConnectConfig ready for use by the REPL or headless runner.
 *
 * Throws DirectConnectError on network, HTTP, or response-parsing failures.
 */
export async function createDirectConnectSession({
  serverUrl,
  authToken,
  cwd,
  dangerouslySkipPermissions,
}: {
  serverUrl: string
  authToken?: string
  cwd: string
  dangerouslySkipPermissions?: boolean
}): Promise<{
  config: DirectConnectConfig
  workDir?: string
}> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }
  if (authToken) {
    headers['authorization'] = `Bearer ${authToken}`
  }

  const payload = jsonStringify({
    cwd,
    ...(dangerouslySkipPermissions && {
      dangerously_skip_permissions: true,
    }),
  })

  let statusCode: number
  let statusText: string
  let body: unknown

  if (serverUrl.startsWith('unix:')) {
    const socketPath = serverUrl.slice('unix:'.length)
    try {
      const resp = await postJsonOverUnixSocket({
        socketPath,
        path: '/sessions',
        headers,
        body: payload,
      })
      statusCode = resp.statusCode
      statusText = resp.statusText
      body = resp.body
    } catch (err) {
      throw new DirectConnectError(
        `Failed to connect to unix socket ${socketPath}: ${errorMessage(err)}`,
      )
    }
  } else {
    let resp: Response
    try {
      resp = await fetch(`${serverUrl}/sessions`, {
        method: 'POST',
        headers,
        body: payload,
      })
    } catch (err) {
      throw new DirectConnectError(
        `Failed to connect to server at ${serverUrl}: ${errorMessage(err)}`,
      )
    }
    statusCode = resp.status
    statusText = resp.statusText
    body = await resp.json()
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new DirectConnectError(
      `Failed to create session: ${statusCode} ${statusText}`,
    )
  }

  const result = connectResponseSchema().safeParse(body)
  if (!result.success) {
    throw new DirectConnectError(
      `Invalid session response: ${result.error.message}`,
    )
  }

  const data = result.data
  return {
    config: {
      serverUrl,
      sessionId: data.session_id,
      wsUrl: data.ws_url,
      authToken,
    },
    workDir: data.work_dir,
  }
}

async function postJsonOverUnixSocket({
  socketPath,
  path,
  headers,
  body,
}: {
  socketPath: string
  path: string
  headers: Record<string, string>
  body: string
}): Promise<{
  statusCode: number
  statusText: string
  body: unknown
}> {
  return await new Promise((resolve, reject) => {
    const req = request(
      {
        socketPath,
        path,
        method: 'POST',
        headers: {
          ...headers,
          'content-length': Buffer.byteLength(body).toString(),
        },
      },
      res => {
        const chunks: Buffer[] = []
        res.on('data', chunk =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
        )
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8').trim()
          let parsed: unknown = {}
          if (raw.length > 0) {
            try {
              parsed = JSON.parse(raw)
            } catch {
              reject(new Error(`Invalid JSON response from server: ${raw}`))
              return
            }
          }
          resolve({
            statusCode: res.statusCode ?? 0,
            statusText: res.statusMessage ?? '',
            body: parsed,
          })
        })
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
