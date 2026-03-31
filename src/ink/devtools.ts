// Recovery build: keep a lightweight module so dev-only dynamic import succeeds
// even when react-devtools-core integration is unavailable.
export function connectInkDevtools(): void {}
