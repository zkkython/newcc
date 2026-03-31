type ProactiveActivationSource = 'command' | 'startup' | 'resume' | string

const DEFAULT_TICK_MS = 30_000
const parsedTickMs = Number.parseInt(
  process.env.CLAUDE_CODE_PROACTIVE_TICK_MS ?? '',
  10,
)
const TICK_INTERVAL_MS =
  Number.isFinite(parsedTickMs) && parsedTickMs > 0 ? parsedTickMs : DEFAULT_TICK_MS

let proactiveActive = false
let proactivePaused = false
let contextBlocked = false
let nextTickAt: number | null = null
let tickTimer: NodeJS.Timeout | null = null

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function clearTickTimer(): void {
  if (!tickTimer) return
  clearTimeout(tickTimer)
  tickTimer = null
}

function shouldSchedule(): boolean {
  return proactiveActive && !proactivePaused && !contextBlocked
}

function scheduleTimer(): void {
  clearTickTimer()
  if (!shouldSchedule() || nextTickAt === null) return
  const delay = Math.max(100, nextTickAt - Date.now())
  tickTimer = setTimeout(() => {
    if (!shouldSchedule()) return
    nextTickAt = Date.now() + TICK_INTERVAL_MS
    notify()
    scheduleTimer()
  }, delay)
}

function recomputeNextTick(): void {
  nextTickAt = shouldSchedule() ? Date.now() + TICK_INTERVAL_MS : null
  scheduleTimer()
  notify()
}

export function activateProactive(_source: ProactiveActivationSource): void {
  proactiveActive = true
  proactivePaused = false
  contextBlocked = false
  recomputeNextTick()
}

export function deactivateProactive(): void {
  proactiveActive = false
  proactivePaused = false
  contextBlocked = false
  recomputeNextTick()
}

export function pauseProactive(): void {
  if (!proactiveActive) return
  proactivePaused = true
  recomputeNextTick()
}

export function resumeProactive(): void {
  if (!proactiveActive) return
  proactivePaused = false
  recomputeNextTick()
}

export function setContextBlocked(blocked: boolean): void {
  contextBlocked = blocked
  recomputeNextTick()
}

export function isProactiveActive(): boolean {
  return proactiveActive
}

export function isProactivePaused(): boolean {
  return proactivePaused
}

export function getNextTickAt(): number | null {
  return nextTickAt
}

export function subscribeToProactiveChanges(
  callback: () => void,
): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}
