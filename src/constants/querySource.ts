// Reconstructed query-source typing.
// Original source appears to permit dynamic prefixes (e.g. repl_main_thread:*).

export type QuerySource = string

export const QUERY_SOURCES = [
  'repl_main_thread',
  'sdk',
  'compact',
  'session_memory',
  'auto_dream',
  'magic_docs',
  'extract_memories',
  'permission_explainer',
  'session_search',
  'speculation',
] as const
