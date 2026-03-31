import {
  getSystemThemeName,
  setCachedSystemTheme,
  type SystemTheme,
} from './systemTheme.js'

export function watchSystemTheme(
  _internalQuerier: unknown,
  onTheme: (theme: SystemTheme) => void,
): () => void {
  // Reconstructed fallback: drive auto-theme from cached detection so the UI
  // remains stable even without full OSC11 terminal query plumbing.
  const emit = () => {
    const theme = getSystemThemeName()
    setCachedSystemTheme(theme)
    onTheme(theme)
  }
  emit()
  const timer = setInterval(emit, 10_000)
  timer.unref?.()
  return () => clearInterval(timer)
}
