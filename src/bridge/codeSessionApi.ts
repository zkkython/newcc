/**
 * Thin HTTP wrappers for the CCR v2 code-session API.
 *
 * Separate file from remoteBridgeCore.ts so the SDK /bridge subpath can
 * export createCodeSession + fetchRemoteCredentials without bundling the
 * heavy CLI tree (analytics, transport, etc.). Callers supply explicit
 * accessToken + baseUrl — no implicit auth or config reads.
 */

import axios from 'axios'
import { logForDebugging } from '../utils/debug.js'
import { errorMessage } from '../utils/errors.js'
import { jsonStringify } from '../utils/slowOperations.js'
import { extractErrorDetail } from './debugUtils.js'

const ANTHROPIC_VERSION = '2023-06-01'

export type CodeSessionBridgeOptions = Record<string, unknown>
export type CodeSessionFailureStage =
  | 'create_session'
  | 'fetch_bridge_credentials'
export type CodeSessionFailureKind = 'http' | 'network' | 'schema'
export type CodeSessionFailure = {
  stage: CodeSessionFailureStage
  kind: CodeSessionFailureKind
  status?: number
  detail?: string
}

function oauthHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
  }
}

export async function createCodeSession(
  baseUrl: string,
  accessToken: string,
  title: string,
  timeoutMs: number,
  tags?: string[],
  bridgeOptions?: CodeSessionBridgeOptions,
  onFailure?: (failure: CodeSessionFailure) => void,
): Promise<string | null> {
  const url = `${baseUrl}/v1/code/sessions`
  let response
  const bridgePayload =
    bridgeOptions &&
    typeof bridgeOptions === 'object' &&
    !Array.isArray(bridgeOptions)
      ? bridgeOptions
      : {}
  try {
    response = await axios.post(
      url,
      // bridge: {} is the positive signal for the oneof runner — omitting it
      // (or sending environment_id: "") now 400s. BridgeRunner is an empty
      // message today; it's a placeholder for future bridge-specific options.
      { title, bridge: bridgePayload, ...(tags?.length ? { tags } : {}) },
      {
        headers: oauthHeaders(accessToken),
        timeout: timeoutMs,
        validateStatus: s => s < 500,
      },
    )
  } catch (err: unknown) {
    logForDebugging(
      `[code-session] Session create request failed: ${errorMessage(err)}`,
    )
    onFailure?.({
      stage: 'create_session',
      kind: 'network',
      detail: errorMessage(err),
    })
    return null
  }

  if (response.status !== 200 && response.status !== 201) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[code-session] Session create failed ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    onFailure?.({
      stage: 'create_session',
      kind: 'http',
      status: response.status,
      detail,
    })
    return null
  }

  const data: unknown = response.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('session' in data) ||
    !data.session ||
    typeof data.session !== 'object' ||
    !('id' in data.session) ||
    typeof data.session.id !== 'string' ||
    !data.session.id.startsWith('cse_')
  ) {
    logForDebugging(
      `[code-session] No session.id (cse_*) in response: ${jsonStringify(data).slice(0, 200)}`,
    )
    onFailure?.({
      stage: 'create_session',
      kind: 'schema',
      detail: 'missing session.id cse_* in response',
    })
    return null
  }
  return data.session.id
}

/**
 * Credentials from POST /bridge. JWT is opaque — do not decode.
 * Each /bridge call bumps worker_epoch server-side (it IS the register).
 */
export type RemoteCredentials = {
  worker_jwt: string
  api_base_url: string
  expires_in: number
  worker_epoch: number
}

export async function fetchRemoteCredentials(
  sessionId: string,
  baseUrl: string,
  accessToken: string,
  timeoutMs: number,
  trustedDeviceToken?: string,
  onFailure?: (failure: CodeSessionFailure) => void,
): Promise<RemoteCredentials | null> {
  const url = `${baseUrl}/v1/code/sessions/${sessionId}/bridge`
  const headers = oauthHeaders(accessToken)
  if (trustedDeviceToken) {
    headers['X-Trusted-Device-Token'] = trustedDeviceToken
  }
  let response
  try {
    response = await axios.post(
      url,
      {},
      {
        headers,
        timeout: timeoutMs,
        validateStatus: s => s < 500,
      },
    )
  } catch (err: unknown) {
    logForDebugging(
      `[code-session] /bridge request failed: ${errorMessage(err)}`,
    )
    onFailure?.({
      stage: 'fetch_bridge_credentials',
      kind: 'network',
      detail: errorMessage(err),
    })
    return null
  }

  if (response.status !== 200) {
    const detail = extractErrorDetail(response.data)
    logForDebugging(
      `[code-session] /bridge failed ${response.status}${detail ? `: ${detail}` : ''}`,
    )
    onFailure?.({
      stage: 'fetch_bridge_credentials',
      kind: 'http',
      status: response.status,
      detail,
    })
    return null
  }

  const data: unknown = response.data
  if (
    data === null ||
    typeof data !== 'object' ||
    !('worker_jwt' in data) ||
    typeof data.worker_jwt !== 'string' ||
    !('expires_in' in data) ||
    !('api_base_url' in data) ||
    typeof data.api_base_url !== 'string' ||
    !('worker_epoch' in data)
  ) {
    logForDebugging(
      `[code-session] /bridge response malformed (need worker_jwt, expires_in, api_base_url, worker_epoch): ${jsonStringify(data).slice(0, 200)}`,
    )
    onFailure?.({
      stage: 'fetch_bridge_credentials',
      kind: 'schema',
      detail: 'malformed /bridge response envelope',
    })
    return null
  }
  // protojson serializes int64 as a string to avoid JS precision loss;
  // Go may also return a number depending on encoder settings.
  const rawEpoch = data.worker_epoch
  const epoch = typeof rawEpoch === 'string' ? Number(rawEpoch) : rawEpoch
  const rawExpiresIn = data.expires_in
  const expiresIn =
    typeof rawExpiresIn === 'string' ? Number(rawExpiresIn) : rawExpiresIn
  if (
    typeof epoch !== 'number' ||
    !Number.isFinite(epoch) ||
    !Number.isSafeInteger(epoch) ||
    typeof expiresIn !== 'number' ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    logForDebugging(
      `[code-session] /bridge response invalid epoch/expires_in: epoch=${jsonStringify(rawEpoch)} expires_in=${jsonStringify(rawExpiresIn)}`,
    )
    onFailure?.({
      stage: 'fetch_bridge_credentials',
      kind: 'schema',
      detail: 'invalid worker_epoch/expires_in',
    })
    return null
  }
  return {
    worker_jwt: data.worker_jwt,
    api_base_url: data.api_base_url,
    expires_in: expiresIn,
    worker_epoch: epoch,
  }
}
