import { logForDebugging } from './debug.js'

const STALL_THRESHOLD_MS = 500
const SAMPLE_INTERVAL_MS = 250
let started = false

export function startEventLoopStallDetector(): void {
  if (started) return
  started = true
  let last = Date.now()
  const timer = setInterval(() => {
    const now = Date.now()
    const drift = now - last - SAMPLE_INTERVAL_MS
    if (drift > STALL_THRESHOLD_MS) {
      logForDebugging(`Event loop stall detected: ${Math.round(drift)}ms`, {
        level: 'warn',
      })
    }
    last = now
  }, SAMPLE_INTERVAL_MS)
  timer.unref?.()
}
