import * as signalExitModule from 'signal-exit'

type OnExit = (
  cb: (code: number | null, signal: NodeJS.Signals | null) => void,
  options?: {
    alwaysLast?: boolean
  },
) => () => void

const signalExitAny = signalExitModule as unknown as
  | OnExit
  | {
      onExit?: OnExit
      default?: OnExit | { onExit?: OnExit }
    }

export const onExit: OnExit = (() => {
  if (typeof signalExitAny === 'function') {
    return signalExitAny
  }
  if (typeof signalExitAny.onExit === 'function') {
    return signalExitAny.onExit
  }
  const defaultExport = signalExitAny.default
  if (typeof defaultExport === 'function') {
    return defaultExport
  }
  if (defaultExport && typeof defaultExport.onExit === 'function') {
    return defaultExport.onExit
  }
  return () => () => {}
})()
