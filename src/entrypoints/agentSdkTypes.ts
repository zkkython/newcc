/**
 * Main entrypoint for Claude Code Agent SDK types.
 *
 * This file re-exports the public SDK API from:
 * - sdk/coreTypes.ts - Common serializable types (messages, configs)
 * - sdk/runtimeTypes.ts - Non-serializable types (callbacks, interfaces)
 *
 * SDK builders who need control protocol types should import from
 * sdk/controlTypes.ts directly.
 */

import type {
  CallToolResult,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js'
import { randomUUID } from 'crypto'
import { appendFile, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import {
  buildMissedTaskNotification as buildMissedTaskNotificationImpl,
  createCronScheduler,
} from '../utils/cronScheduler.js'
import { parseJSONL } from '../utils/json.js'
import {
  listSessionsImpl,
  parseSessionInfoFromLite,
} from '../utils/listSessionsImpl.js'
import {
  readSessionLite,
  resolveSessionFilePath,
} from '../utils/sessionStoragePortable.js'
import type { Entry } from '../types/logs.js'

// Control protocol types for SDK builders (bridge subpath consumers)
/** @alpha */
export type {
  SDKControlRequest,
  SDKControlResponse,
} from './sdk/controlTypes.js'
// Re-export core types (common serializable types)
export * from './sdk/coreTypes.js'
// Re-export runtime types (callbacks, interfaces with methods)
export * from './sdk/runtimeTypes.js'

// Re-export settings types (generated from settings JSON schema)
export type { Settings } from './sdk/settingsTypes.generated.js'
// Re-export tool types (all marked @internal until SDK API stabilizes)
export * from './sdk/toolTypes.js'

// ============================================================================
// Functions
// ============================================================================

import type {
  SDKMessage,
  SDKResultMessage,
  SDKSessionInfo,
  SDKUserMessage,
} from './sdk/coreTypes.js'
// Import types needed for function signatures
import type {
  AnyZodRawShape,
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionInfoOptions,
  GetSessionMessagesOptions,
  InferShape,
  InternalOptions,
  InternalQuery,
  ListSessionsOptions,
  McpSdkServerConfigWithInstance,
  Options,
  Query,
  SDKSession,
  SDKSessionOptions,
  SdkMcpToolDefinition,
  SessionMessage,
  SessionMutationOptions,
} from './sdk/runtimeTypes.js'

export type {
  ListSessionsOptions,
  GetSessionInfoOptions,
  SessionMutationOptions,
  ForkSessionOptions,
  ForkSessionResult,
  SDKSessionInfo,
}

export function tool<Schema extends AnyZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (
    args: InferShape<Schema>,
    extra: unknown,
  ) => Promise<CallToolResult>,
  extras?: {
    annotations?: ToolAnnotations
    searchHint?: string
    alwaysLoad?: boolean
  },
): SdkMcpToolDefinition<Schema> {
  return {
    name,
    description,
    inputSchema,
    handler,
    extras,
  }
}

type CreateSdkMcpServerOptions = {
  name: string
  version?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: Array<SdkMcpToolDefinition<any>>
}

/**
 * Creates an MCP server instance that can be used with the SDK transport.
 * This allows SDK users to define custom tools that run in the same process.
 *
 * If your SDK MCP calls will run longer than 60s, override CLAUDE_CODE_STREAM_CLOSE_TIMEOUT
 */
export function createSdkMcpServer(
  options: CreateSdkMcpServerOptions,
): McpSdkServerConfigWithInstance {
  return {
    type: 'sdk',
    name: options.name,
    instance: {
      name: options.name,
      version: options.version ?? '1.0.0',
      tools: options.tools ?? [],
    },
  }
}

export class AbortError extends Error {}

/** @internal */
export function query(_params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: InternalOptions
}): InternalQuery
export function query(_params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}): Query
export function query(params?: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}): Query {
  return (async function* () {
    if (params?.prompt && typeof params.prompt !== 'string') {
      for await (const userMsg of params.prompt) {
        yield userMsg as SDKMessage
      }
    } else if (typeof params?.prompt === 'string') {
      yield {
        type: 'user',
        message: {
          role: 'user',
          content: params.prompt,
        },
        parent_tool_use_id: null,
      } as SDKMessage
    }
    yield buildResultMessage(
      'error_during_execution',
      ['query() runtime is unavailable in this reconstructed SDK build'],
    ) as SDKMessage
  })()
}

function buildResultMessage(
  subtype:
    | 'success'
    | 'error_during_execution'
    | 'error_max_turns'
    | 'error_max_budget_usd'
    | 'error_max_structured_output_retries',
  errors?: string[],
): SDKResultMessage {
  const base = {
    type: 'result' as const,
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: subtype !== 'success',
    num_turns: 0,
    stop_reason: null,
    total_cost_usd: 0,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      service_tier: 'standard' as const,
    },
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    session_id: randomUUID(),
  }
  if (subtype === 'success') {
    return {
      ...base,
      subtype,
      result: '',
    }
  }
  return {
    ...base,
    subtype,
    errors: errors ?? ['Unknown error'],
  }
}

function createSessionObject(
  sessionId: string,
  options: SDKSessionOptions,
): SDKSession {
  return {
    id: sessionId,
    query(params: { prompt: string }): Query {
      return query({
        prompt: params.prompt,
        options: options.options ?? {},
      })
    },
    async prompt(message: string): Promise<SDKResultMessage> {
      let last: SDKResultMessage | null = null
      for await (const msg of query({
        prompt: message,
        options: options.options ?? {},
      })) {
        if (msg.type === 'result') {
          last = msg as SDKResultMessage
        }
      }
      return last ?? buildResultMessage('error_during_execution', ['No result'])
    },
    getInfo(opts?: GetSessionInfoOptions): Promise<SDKSessionInfo | undefined> {
      return getSessionInfo(sessionId, opts)
    },
    getMessages(
      opts?: GetSessionMessagesOptions,
    ): Promise<SessionMessage[]> {
      return getSessionMessages(sessionId, opts)
    },
    fork(options?: ForkSessionOptions): Promise<ForkSessionResult> {
      return forkSession(sessionId, options)
    },
  }
}

/**
 * V2 API - UNSTABLE
 * Create a persistent session for multi-turn conversations.
 * @alpha
 */
export function unstable_v2_createSession(
  options: SDKSessionOptions,
): SDKSession {
  return createSessionObject(randomUUID(), options)
}

/**
 * V2 API - UNSTABLE
 * Resume an existing session by ID.
 * @alpha
 */
export function unstable_v2_resumeSession(
  sessionId: string,
  options: SDKSessionOptions,
): SDKSession {
  return createSessionObject(sessionId, options)
}

// @[MODEL LAUNCH]: Update the example model ID in this docstring.
/**
 * V2 API - UNSTABLE
 * One-shot convenience function for single prompts.
 * @alpha
 *
 * @example
 * ```typescript
 * const result = await unstable_v2_prompt("What files are here?", {
 *   model: 'claude-sonnet-4-6'
 * })
 * ```
 */
export async function unstable_v2_prompt(
  message: string,
  options: SDKSessionOptions,
): Promise<SDKResultMessage> {
  return createSessionObject(randomUUID(), options).prompt(message)
}

/**
 * Reads a session's conversation messages from its JSONL transcript file.
 *
 * Parses the transcript, builds the conversation chain via parentUuid links,
 * and returns user/assistant messages in chronological order. Set
 * `includeSystemMessages: true` in options to also include system messages.
 *
 * @param sessionId - UUID of the session to read
 * @param options - Optional dir, limit, offset, and includeSystemMessages
 * @returns Array of messages, or empty array if session not found
 */
export async function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions,
): Promise<SessionMessage[]> {
  const resolved = await resolveSessionFilePath(sessionId, options?.dir)
  if (!resolved) return []

  const content = await readFile(resolved.filePath, 'utf8').catch(() => '')
  if (!content) return []

  const allEntries = parseJSONL<Entry>(content)
  const transcript = allEntries.filter(
    (entry): entry is Entry & { uuid: string; parentUuid: string | null } =>
      typeof entry === 'object' &&
      entry !== null &&
      'uuid' in entry &&
      'parentUuid' in entry &&
      (entry as { isSidechain?: boolean }).isSidechain !== true,
  )
  if (transcript.length === 0) return []

  const byUuid = new Map(
    transcript
      .map(m => [m.uuid, m] as const)
      .filter(([uuid]) => typeof uuid === 'string'),
  )
  const leaf = transcript.reduce((latest, cur) => {
    const latestTs = Date.parse((latest as { timestamp?: string }).timestamp ?? '')
    const curTs = Date.parse((cur as { timestamp?: string }).timestamp ?? '')
    if (!Number.isNaN(curTs) && (Number.isNaN(latestTs) || curTs > latestTs)) {
      return cur
    }
    return latest
  }, transcript[transcript.length - 1]!)

  const chain: SessionMessage[] = []
  const seen = new Set<string>()
  let cur: (typeof transcript)[number] | undefined = leaf
  while (cur && !seen.has(cur.uuid)) {
    seen.add(cur.uuid)
    const type = (cur as { type?: string }).type
    if (
      type === 'user' ||
      type === 'assistant' ||
      (options?.includeSystemMessages && type === 'system')
    ) {
      chain.push({
        ...(cur as Record<string, unknown>),
        session_id: (cur as { sessionId?: string }).sessionId ?? sessionId,
      } as SessionMessage)
    }
    const parentUuid = (cur as { parentUuid?: string | null }).parentUuid
    cur =
      typeof parentUuid === 'string' ? byUuid.get(parentUuid) : undefined
  }

  chain.reverse()
  const offset = Math.max(0, options?.offset ?? 0)
  const limit = options?.limit && options.limit > 0 ? options.limit : undefined
  return limit ? chain.slice(offset, offset + limit) : chain.slice(offset)
}

/**
 * List sessions with metadata.
 *
 * When `dir` is provided, returns sessions for that project directory
 * and its git worktrees. When omitted, returns sessions across all
 * projects.
 *
 * Use `limit` and `offset` for pagination.
 *
 * @example
 * ```typescript
 * // List sessions for a specific project
 * const sessions = await listSessions({ dir: '/path/to/project' })
 *
 * // Paginate
 * const page1 = await listSessions({ limit: 50 })
 * const page2 = await listSessions({ limit: 50, offset: 50 })
 * ```
 */
export async function listSessions(
  options?: ListSessionsOptions,
): Promise<SDKSessionInfo[]> {
  return (await listSessionsImpl(options)) as SDKSessionInfo[]
}

/**
 * Reads metadata for a single session by ID. Unlike `listSessions`, this only
 * reads the single session file rather than every session in the project.
 * Returns undefined if the session file is not found, is a sidechain session,
 * or has no extractable summary.
 *
 * @param sessionId - UUID of the session
 * @param options - `{ dir?: string }` project path; omit to search all project directories
 */
export async function getSessionInfo(
  sessionId: string,
  options?: GetSessionInfoOptions,
): Promise<SDKSessionInfo | undefined> {
  const resolved = await resolveSessionFilePath(sessionId, options?.dir)
  if (!resolved) return undefined
  const lite = await readSessionLite(resolved.filePath)
  if (!lite) return undefined
  return (
    parseSessionInfoFromLite(sessionId, lite, resolved.projectPath) ?? undefined
  ) as SDKSessionInfo | undefined
}

/**
 * Rename a session. Appends a custom-title entry to the session's JSONL file.
 * @param sessionId - UUID of the session
 * @param title - New title
 * @param options - `{ dir?: string }` project path; omit to search all projects
 */
export async function renameSession(
  sessionId: string,
  title: string,
  _options?: SessionMutationOptions,
): Promise<void> {
  const resolved = await resolveSessionFilePath(sessionId)
  if (!resolved) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  await appendJsonlEntry(resolved.filePath, {
    type: 'custom-title',
    sessionId,
    customTitle: title,
  })
}

/**
 * Tag a session. Pass null to clear the tag.
 * @param sessionId - UUID of the session
 * @param tag - Tag string, or null to clear
 * @param options - `{ dir?: string }` project path; omit to search all projects
 */
export async function tagSession(
  sessionId: string,
  tag: string | null,
  _options?: SessionMutationOptions,
): Promise<void> {
  const resolved = await resolveSessionFilePath(sessionId)
  if (!resolved) {
    throw new Error(`Session not found: ${sessionId}`)
  }
  await appendJsonlEntry(resolved.filePath, {
    type: 'tag',
    sessionId,
    tag: tag ?? '',
  })
}

/**
 * Fork a session into a new branch with fresh UUIDs.
 *
 * Copies transcript messages from the source session into a new session file,
 * remapping every message UUID and preserving the parentUuid chain. Supports
 * `upToMessageId` for branching from a specific point in the conversation.
 *
 * Forked sessions start without undo history (file-history snapshots are not
 * copied).
 *
 * @param sessionId - UUID of the source session
 * @param options - `{ dir?, upToMessageId?, title? }`
 * @returns `{ sessionId }` — UUID of the new forked session
 */
export async function forkSession(
  sessionId: string,
  options?: ForkSessionOptions,
): Promise<ForkSessionResult> {
  const resolved = await resolveSessionFilePath(sessionId)
  if (!resolved) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  const original = await readFile(resolved.filePath, 'utf8')
  const entries = parseJSONL<Entry>(original)
  const forkSessionId = randomUUID()
  const uuidMap = new Map<string, string>()

  const translated = entries.map(entry => {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'uuid' in entry &&
      typeof (entry as { uuid?: unknown }).uuid === 'string'
    ) {
      const current = entry as Record<string, unknown>
      const oldUuid = current.uuid as string
      const newUuid = uuidMap.get(oldUuid) ?? randomUUID()
      uuidMap.set(oldUuid, newUuid)
      const parent = current.parentUuid
      return {
        ...current,
        uuid: newUuid,
        parentUuid:
          typeof parent === 'string' ? (uuidMap.get(parent) ?? null) : null,
        sessionId: forkSessionId,
        isSidechain: false,
        forkedFrom: { sessionId, messageUuid: oldUuid },
      }
    }
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'sessionId' in entry
    ) {
      return {
        ...(entry as Record<string, unknown>),
        sessionId: forkSessionId,
      }
    }
    return entry
  })

  const outputPath = join(dirname(resolved.filePath), `${forkSessionId}.jsonl`)
  const data =
    translated
      .map(item => JSON.stringify(item))
      .join('\n')
      .concat('\n')
  await writeFile(outputPath, data, { encoding: 'utf8', mode: 0o600 })

  const requestedTitle = (options?.options as { title?: unknown } | undefined)
    ?.title
  if (typeof requestedTitle === 'string' && requestedTitle.trim().length > 0) {
    await appendJsonlEntry(outputPath, {
      type: 'custom-title',
      sessionId: forkSessionId,
      customTitle: requestedTitle,
    })
  }
  return { sessionId: forkSessionId }
}

// ============================================================================
// Assistant daemon primitives (internal)
// ============================================================================

/**
 * A scheduled task from `<dir>/.claude/scheduled_tasks.json`.
 * @internal
 */
export type CronTask = {
  id: string
  cron: string
  prompt: string
  createdAt: number
  recurring?: boolean
}

/**
 * Cron scheduler tuning knobs (jitter + expiry). Sourced at runtime from the
 * `tengu_kairos_cron_config` GrowthBook config in CLI sessions; daemon hosts
 * pass this through `watchScheduledTasks({ getJitterConfig })` to get the
 * same tuning.
 * @internal
 */
export type CronJitterConfig = {
  recurringFrac: number
  recurringCapMs: number
  oneShotMaxMs: number
  oneShotFloorMs: number
  oneShotMinuteMod: number
  recurringMaxAgeMs: number
}

/**
 * Event yielded by `watchScheduledTasks()`.
 * @internal
 */
export type ScheduledTaskEvent =
  | { type: 'fire'; task: CronTask }
  | { type: 'missed'; tasks: CronTask[] }

/**
 * Handle returned by `watchScheduledTasks()`.
 * @internal
 */
export type ScheduledTasksHandle = {
  /** Async stream of fire/missed events. Drain with `for await`. */
  events(): AsyncGenerator<ScheduledTaskEvent>
  /**
   * Epoch ms of the soonest scheduled fire across all loaded tasks, or null
   * if nothing is scheduled. Useful for deciding whether to tear down an
   * idle agent subprocess or keep it warm for an imminent fire.
   */
  getNextFireTime(): number | null
}

/**
 * Watch `<dir>/.claude/scheduled_tasks.json` and yield events as tasks fire.
 *
 * Acquires the per-directory scheduler lock (PID-based liveness) so a REPL
 * session in the same dir won't double-fire. Releases the lock and closes
 * the file watcher when the signal aborts.
 *
 * - `fire` — a task whose cron schedule was met. One-shot tasks are already
 *   deleted from the file when this yields; recurring tasks are rescheduled
 *   (or deleted if aged out).
 * - `missed` — one-shot tasks whose window passed while the daemon was down.
 *   Yielded once on initial load; a background delete removes them from the
 *   file shortly after.
 *
 * Intended for daemon architectures that own the scheduler externally and
 * spawn the agent via `query()`; the agent subprocess (`-p` mode) does not
 * run its own scheduler.
 *
 * @internal
 */
export function watchScheduledTasks(_opts: {
  dir: string
  signal: AbortSignal
  getJitterConfig?: () => CronJitterConfig
}): ScheduledTasksHandle {
  const queue: ScheduledTaskEvent[] = []
  const waiters: Array<(event: ScheduledTaskEvent | null) => void> = []
  let closed = false

  const pushEvent = (event: ScheduledTaskEvent) => {
    if (closed) return
    const waiter = waiters.shift()
    if (waiter) waiter(event)
    else queue.push(event)
  }

  const scheduler = createCronScheduler({
    dir: _opts.dir,
    lockIdentity: randomUUID(),
    isLoading: () => false,
    getJitterConfig: _opts.getJitterConfig,
    onFire: () => undefined,
    onFireTask: task => pushEvent({ type: 'fire', task }),
    onMissed: tasks => pushEvent({ type: 'missed', tasks }),
  })
  scheduler.start()

  const close = () => {
    if (closed) return
    closed = true
    scheduler.stop()
    while (waiters.length > 0) {
      waiters.shift()?.(null)
    }
  }
  _opts.signal.addEventListener('abort', close, { once: true })

  return {
    async *events() {
      while (true) {
        if (queue.length > 0) {
          const next = queue.shift()!
          yield next
          continue
        }
        if (closed) break
        const next = await new Promise<ScheduledTaskEvent | null>(resolve =>
          waiters.push(resolve),
        )
        if (!next) break
        yield next
      }
    },
    getNextFireTime() {
      return scheduler.getNextFireTime()
    },
  }
}

/**
 * Format missed one-shot tasks into a prompt that asks the model to confirm
 * with the user (via AskUserQuestion) before executing.
 * @internal
 */
export function buildMissedTaskNotification(missed: CronTask[]): string {
  return buildMissedTaskNotificationImpl(missed)
}

/**
 * A user message typed on claude.ai, extracted from the bridge WS.
 * @internal
 */
export type InboundPrompt = {
  content: string | unknown[]
  uuid?: string
}

/**
 * Options for connectRemoteControl.
 * @internal
 */
export type ConnectRemoteControlOptions = {
  dir: string
  name?: string
  workerType?: string
  branch?: string
  gitRepoUrl?: string | null
  getAccessToken: () => string | undefined
  baseUrl: string
  orgUUID: string
  model: string
}

/**
 * Handle returned by connectRemoteControl. Write query() yields in,
 * read inbound prompts out. See src/assistant/daemonBridge.ts for full
 * field documentation.
 * @internal
 */
export type RemoteControlHandle = {
  sessionUrl: string
  environmentId: string
  bridgeSessionId: string
  write(msg: SDKMessage): void
  sendResult(): void
  sendControlRequest(req: unknown): void
  sendControlResponse(res: unknown): void
  sendControlCancelRequest(requestId: string): void
  inboundPrompts(): AsyncGenerator<InboundPrompt>
  controlRequests(): AsyncGenerator<unknown>
  permissionResponses(): AsyncGenerator<unknown>
  onStateChange(
    cb: (
      state: 'ready' | 'connected' | 'reconnecting' | 'failed',
      detail?: string,
    ) => void,
  ): void
  teardown(): Promise<void>
}

/**
 * Hold a claude.ai remote-control bridge connection from a daemon process.
 *
 * The daemon owns the WebSocket in the PARENT process — if the agent
 * subprocess (spawned via `query()`) crashes, the daemon respawns it while
 * claude.ai keeps the same session. Contrast with `query.enableRemoteControl`
 * which puts the WS in the CHILD process (dies with the agent).
 *
 * Pipe `query()` yields through `write()` + `sendResult()`. Read
 * `inboundPrompts()` (user typed on claude.ai) into `query()`'s input
 * stream. Handle `controlRequests()` locally (interrupt → abort, set_model
 * → reconfigure).
 *
 * Skips the `tengu_ccr_bridge` gate and policy-limits check — @internal
 * caller is pre-entitled. OAuth is still required (env var or keychain).
 *
 * Returns null on no-OAuth or registration failure.
 *
 * @internal
 */
export async function connectRemoteControl(
  _opts: ConnectRemoteControlOptions,
): Promise<RemoteControlHandle | null> {
  return null
}

async function appendJsonlEntry(
  filePath: string,
  entry: Record<string, unknown>,
): Promise<void> {
  const line = JSON.stringify(entry)
  await appendFile(filePath, `${line}\n`, { encoding: 'utf8', mode: 0o600 })
}
