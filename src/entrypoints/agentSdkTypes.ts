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
import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages.mjs'
import { randomUUID } from 'crypto'
import { appendFile, readFile, writeFile } from 'fs/promises'
import { hostname } from 'os'
import { dirname, join } from 'path'
import { ask } from '../QueryEngine.js'
import {
  query as queryImpl,
  type QueryParams as InternalQueryParams,
} from '../query.js'
import { getCommands } from '../commands.js'
import {
  archiveBridgeSession,
  createBridgeSession,
} from '../bridge/createSession.js'
import { initBridgeCore } from '../bridge/replBridge.js'
import { createStore } from '../state/store.js'
import { getDefaultAppState, type AppState } from '../state/AppStateStore.js'
import { getTools } from '../tools.js'
import type { Message } from '../types/message.js'
import { getCwd } from '../utils/cwd.js'
import {
  createFileStateCacheWithSizeLimit,
  READ_FILE_STATE_CACHE_SIZE,
  type FileStateCache,
} from '../utils/fileStateCache.js'
import type { CanUseToolFn } from '../hooks/useCanUseTool.js'
import { hasPermissionsToUseTool } from '../utils/permissions/permissions.js'
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

type PromptSessionContext = {
  mutableMessages: Message[]
  readFileCache: FileStateCache
  appStateStore: ReturnType<typeof createStore<AppState>>
}

const promptSessionContexts = new Map<string, PromptSessionContext>()

function createPromptSessionContext(): PromptSessionContext {
  return {
    mutableMessages: [],
    readFileCache: createFileStateCacheWithSizeLimit(READ_FILE_STATE_CACHE_SIZE),
    appStateStore: createStore(getDefaultAppState()),
  }
}

function getPromptSessionContext(sessionId?: string): PromptSessionContext {
  if (!sessionId) return createPromptSessionContext()
  const existing = promptSessionContexts.get(sessionId)
  if (existing) return existing
  const created = createPromptSessionContext()
  promptSessionContexts.set(sessionId, created)
  return created
}

function normalizePromptContent(
  value: unknown,
): string | ContentBlockParam[] | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value as ContentBlockParam[]
  return null
}

async function withAbortAndTimeout<T>(
  fn: () => Promise<T>,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<T> {
  const { timeoutMs, signal } = opts ?? {}
  if (!timeoutMs && !signal) return fn()

  return await new Promise<T>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    let done = false

    const finish = (runner: () => void) => {
      if (done) return
      done = true
      if (timeout) clearTimeout(timeout)
      if (signal) signal.removeEventListener('abort', onAbort)
      runner()
    }

    const onAbort = () =>
      finish(() =>
        reject(
          new AbortError(
            signal?.reason instanceof Error
              ? signal.reason.message
              : 'Operation aborted',
          ),
        ),
      )

    if (signal?.aborted) {
      onAbort()
      return
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true })
    if (timeoutMs && timeoutMs > 0) {
      timeout = setTimeout(
        () => finish(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`))),
        timeoutMs,
      )
    }

    fn().then(
      value => finish(() => resolve(value)),
      error => finish(() => reject(error)),
    )
  })
}

async function* runPromptQuery(
  prompt: string | AsyncIterable<SDKUserMessage>,
  options?: Options,
  sessionId?: string,
): Query {
  const opts = (options ?? {}) as Record<string, unknown>
  const context = getPromptSessionContext(sessionId)
  const cwd = typeof opts.cwd === 'string' ? opts.cwd : getCwd()

  const commands = Array.isArray(opts.commands)
    ? (opts.commands as Awaited<ReturnType<typeof getCommands>>)
    : await getCommands(cwd)
  const tools = Array.isArray(opts.tools)
    ? (opts.tools as ReturnType<typeof getTools>)
    : getTools(context.appStateStore.getState().toolPermissionContext)
  const canUseTool =
    (typeof opts.canUseTool === 'function'
      ? (opts.canUseTool as CanUseToolFn)
      : hasPermissionsToUseTool) ?? hasPermissionsToUseTool
  const mcpClients = Array.isArray(opts.mcpClients)
    ? (opts.mcpClients as AppState['mcp']['clients'])
    : context.appStateStore.getState().mcp.clients

  const prompts: Array<{
    content: string | ContentBlockParam[]
    uuid?: string
    isMeta?: boolean
  }> = []
  if (typeof prompt === 'string') {
    prompts.push({ content: prompt })
  } else {
    for await (const userMessage of prompt) {
      const content = normalizePromptContent(userMessage.message?.content)
      if (!content) continue
      prompts.push({
        content,
        uuid: userMessage.uuid,
        isMeta: userMessage.isSynthetic,
      })
    }
  }

  for (const item of prompts) {
    yield* ask({
      commands,
      prompt: item.content,
      promptUuid: item.uuid,
      isMeta: item.isMeta,
      cwd,
      tools,
      mcpClients,
      canUseTool,
      mutableMessages: context.mutableMessages,
      getReadFileCache: () => context.readFileCache,
      setReadFileCache: cache => {
        context.readFileCache = cache
      },
      getAppState: context.appStateStore.getState,
      setAppState: context.appStateStore.setState,
      userSpecifiedModel:
        typeof opts.model === 'string' ? opts.model : undefined,
      fallbackModel:
        typeof opts.fallbackModel === 'string' ? opts.fallbackModel : undefined,
      customSystemPrompt:
        typeof opts.systemPrompt === 'string' ? opts.systemPrompt : undefined,
      appendSystemPrompt:
        typeof opts.appendSystemPrompt === 'string'
          ? opts.appendSystemPrompt
          : undefined,
      maxTurns: typeof opts.maxTurns === 'number' ? opts.maxTurns : undefined,
      maxBudgetUsd:
        typeof opts.maxBudgetUsd === 'number' ? opts.maxBudgetUsd : undefined,
      taskBudget:
        typeof opts.taskBudget === 'object' && opts.taskBudget
          ? (opts.taskBudget as { total: number })
          : undefined,
      replayUserMessages: Boolean(opts.replayUserMessages),
      includePartialMessages: Boolean(opts.includePartialMessages),
      verbose: Boolean(opts.verbose),
      jsonSchema:
        typeof opts.jsonSchema === 'object' && opts.jsonSchema
          ? (opts.jsonSchema as Record<string, unknown>)
          : undefined,
    })
  }
}

/** @internal */
export function query(_params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: InternalOptions
}): InternalQuery
export function query(_params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}): Query
export function query(params: InternalQueryParams): ReturnType<typeof queryImpl>
export function query(params?: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
} | InternalQueryParams): Query | ReturnType<typeof queryImpl> {
  if (
    params &&
    typeof params === 'object' &&
    'messages' in params &&
    'systemPrompt' in params &&
    'toolUseContext' in params
  ) {
    return queryImpl(params as InternalQueryParams)
  }
  const promptParam =
    params &&
    typeof params === 'object' &&
    'prompt' in params &&
    params.prompt !== undefined
      ? params.prompt
      : ''
  const promptOptions =
    params && typeof params === 'object' && 'options' in params
      ? params.options
      : undefined
  return runPromptQuery(
    promptParam as string | AsyncIterable<SDKUserMessage>,
    promptOptions,
  )
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
      return runPromptQuery(params.prompt, options.options ?? {}, sessionId)
    },
    async prompt(message: string): Promise<SDKResultMessage> {
      let last: SDKResultMessage | null = null
      for await (const msg of runPromptQuery(
        message,
        options.options ?? {},
        sessionId,
      )) {
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
  return withAbortAndTimeout(async () => {
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
      const latestTs = Date.parse(
        (latest as { timestamp?: string }).timestamp ?? '',
      )
      const curTs = Date.parse((cur as { timestamp?: string }).timestamp ?? '')
      if (
        !Number.isNaN(curTs) &&
        (Number.isNaN(latestTs) || curTs > latestTs)
      ) {
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
      cur = typeof parentUuid === 'string' ? byUuid.get(parentUuid) : undefined
    }

    chain.reverse()
    const offset = Math.max(0, options?.offset ?? 0)
    const limit =
      options?.limit && options.limit > 0 ? options.limit : undefined
    return limit ? chain.slice(offset, offset + limit) : chain.slice(offset)
  }, options)
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
  return withAbortAndTimeout(
    async () => (await listSessionsImpl(options)) as SDKSessionInfo[],
    options,
  )
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
  return withAbortAndTimeout(async () => {
    const resolved = await resolveSessionFilePath(sessionId, options?.dir)
    if (!resolved) return undefined
    const lite = await readSessionLite(resolved.filePath)
    if (!lite) return undefined
    return (
      parseSessionInfoFromLite(sessionId, lite, resolved.projectPath) ??
      undefined
    ) as SDKSessionInfo | undefined
  }, options)
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
  options?: SessionMutationOptions,
): Promise<void> {
  await withAbortAndTimeout(async () => {
    const resolved = await resolveSessionFilePath(sessionId, options?.dir)
    if (!resolved) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    await appendJsonlEntry(resolved.filePath, {
      type: 'custom-title',
      sessionId,
      customTitle: title,
    })
  }, options)
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
  options?: SessionMutationOptions,
): Promise<void> {
  await withAbortAndTimeout(async () => {
    const resolved = await resolveSessionFilePath(sessionId, options?.dir)
    if (!resolved) {
      throw new Error(`Session not found: ${sessionId}`)
    }
    await appendJsonlEntry(resolved.filePath, {
      type: 'tag',
      sessionId,
      tag: tag ?? '',
    })
  }, options)
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
  return withAbortAndTimeout(async () => {
    const resolved = await resolveSessionFilePath(sessionId, options?.dir)
    if (!resolved) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const original = await readFile(resolved.filePath, 'utf8')
    const entries = parseJSONL<Entry>(original)
    const forkSessionId = randomUUID()
    const uuidMap = new Map<string, string>()
    const translated: unknown[] = []
    const upToMessageId = options?.upToMessageId
    let hitUpToMessageId = false

    for (const entry of entries) {
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
        translated.push({
          ...current,
          uuid: newUuid,
          parentUuid:
            typeof parent === 'string' ? (uuidMap.get(parent) ?? null) : null,
          sessionId: forkSessionId,
          isSidechain: false,
          forkedFrom: { sessionId, messageUuid: oldUuid },
        })
        if (upToMessageId && oldUuid === upToMessageId) {
          hitUpToMessageId = true
          break
        }
        continue
      }
      if (typeof entry === 'object' && entry !== null && 'sessionId' in entry) {
        translated.push({
          ...(entry as Record<string, unknown>),
          sessionId: forkSessionId,
        })
      } else {
        translated.push(entry)
      }
    }

    if (upToMessageId && !hitUpToMessageId) {
      throw new Error(`Message not found in session: ${upToMessageId}`)
    }

    const outputPath = join(
      dirname(resolved.filePath),
      `${forkSessionId}.jsonl`,
    )
    const data =
      translated
        .map(item => JSON.stringify(item))
        .join('\n')
        .concat('\n')
    await writeFile(outputPath, data, { encoding: 'utf8', mode: 0o600 })

    const requestedTitle =
      options?.title ??
      ((options?.options as { title?: unknown } | undefined)?.title as
        | string
        | undefined)
    if (typeof requestedTitle === 'string' && requestedTitle.trim().length > 0) {
      await appendJsonlEntry(outputPath, {
        type: 'custom-title',
        sessionId: forkSessionId,
        customTitle: requestedTitle,
      })
    }
    return { sessionId: forkSessionId }
  }, options)
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
  opts: ConnectRemoteControlOptions,
): Promise<RemoteControlHandle | null> {
  type Queue<T> = {
    push(value: T): void
    end(): void
    stream(): AsyncGenerator<T>
  }
  function createQueue<T>(): Queue<T> {
    const values: T[] = []
    const waiters: Array<(value: T | null) => void> = []
    let ended = false
    return {
      push(value: T) {
        if (ended) return
        const waiter = waiters.shift()
        if (waiter) waiter(value)
        else values.push(value)
      },
      end() {
        if (ended) return
        ended = true
        while (waiters.length > 0) {
          waiters.shift()?.(null)
        }
      },
      async *stream() {
        while (true) {
          if (values.length > 0) {
            yield values.shift() as T
            continue
          }
          if (ended) break
          const next = await new Promise<T | null>(resolve => waiters.push(resolve))
          if (next === null) break
          yield next
        }
      },
    }
  }

  const inboundPromptQueue = createQueue<InboundPrompt>()
  const controlRequestQueue = createQueue<unknown>()
  const permissionResponseQueue = createQueue<unknown>()
  const stateListeners = new Set<
    (state: 'ready' | 'connected' | 'reconnecting' | 'failed', detail?: string) => void
  >()

  const handle = await initBridgeCore({
    dir: opts.dir,
    machineName: hostname(),
    branch: opts.branch ?? '',
    gitRepoUrl: opts.gitRepoUrl ?? null,
    title: opts.name ?? `remote-control-${randomUUID().slice(0, 8)}`,
    baseUrl: opts.baseUrl,
    sessionIngressUrl: opts.baseUrl,
    workerType: opts.workerType ?? 'claude_code',
    getAccessToken: opts.getAccessToken,
    createSession: createOpts =>
      createBridgeSession({
        ...createOpts,
        events: [],
        baseUrl: opts.baseUrl,
        getAccessToken: opts.getAccessToken,
      }),
    archiveSession: async sessionId => {
      await archiveBridgeSession(sessionId, {
        baseUrl: opts.baseUrl,
        getAccessToken: opts.getAccessToken,
      }).catch(() => {})
    },
    onInboundMessage: msg => {
      if (msg.type === 'user') {
        inboundPromptQueue.push({
          content: msg.message.content,
          uuid: msg.uuid,
        })
      }
    },
    onPermissionResponse: response => {
      permissionResponseQueue.push(response)
    },
    onInterrupt: () => {
      controlRequestQueue.push({ type: 'interrupt' })
    },
    onSetModel: model => {
      controlRequestQueue.push({ type: 'set_model', model })
    },
    onStateChange: (state, detail) => {
      for (const listener of stateListeners) {
        listener(state, detail)
      }
    },
  })
  if (!handle) return null

  return {
    sessionUrl: `${opts.baseUrl}/v1/sessions/${handle.bridgeSessionId}`,
    environmentId: handle.environmentId,
    bridgeSessionId: handle.bridgeSessionId,
    write(msg: SDKMessage) {
      handle.writeSdkMessages([msg])
    },
    sendResult() {
      handle.sendResult()
    },
    sendControlRequest(req: unknown) {
      handle.sendControlRequest(req as never)
    },
    sendControlResponse(res: unknown) {
      handle.sendControlResponse(res as never)
    },
    sendControlCancelRequest(requestId: string) {
      handle.sendControlCancelRequest(requestId)
    },
    inboundPrompts() {
      return inboundPromptQueue.stream()
    },
    controlRequests() {
      return controlRequestQueue.stream()
    },
    permissionResponses() {
      return permissionResponseQueue.stream()
    },
    onStateChange(cb) {
      stateListeners.add(cb)
    },
    async teardown() {
      inboundPromptQueue.end()
      controlRequestQueue.end()
      permissionResponseQueue.end()
      stateListeners.clear()
      await handle.teardown()
    },
  }
}

async function appendJsonlEntry(
  filePath: string,
  entry: Record<string, unknown>,
): Promise<void> {
  const line = JSON.stringify(entry)
  await appendFile(filePath, `${line}\n`, { encoding: 'utf8', mode: 0o600 })
}
