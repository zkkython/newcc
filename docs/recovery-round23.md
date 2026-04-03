# Recovery Round 23

Date: 2026-04-01

## Scope
Restore direct-connect execution gaps:

- headless execution (`claude open <cc-url> -p`) from placeholder output to real session message flow
- `cc+unix://` connect URL path to a minimal usable baseline

## Changes

- `src/server/connectHeadless.ts`
  - Replaced static "reconstructed mode" note output with a real `DirectConnectSessionManager` loop.
  - Added real session lifecycle handling:
    - connect
    - send prompt
    - stream/collect SDK messages
    - stop on `result`
    - disconnect and exit
  - Added stdin prompt support for `-p` without inline prompt when stdin is piped.
  - Implemented output mode behavior:
    - `stream-json`: forwards SDK messages as NDJSON lines.
    - `json`: prints final `result` message JSON.
    - `text`: prints final result text / failure reason.
  - Added deterministic handling for unsupported permission prompts in headless direct-connect mode (auto-deny response to prevent hangs).
  - Added timeout guard for stalled sessions.

- `src/server/parseConnectUrl.ts`
  - Implemented `cc+unix://` parsing:
    - decodes socket path
    - validates absolute unix path
    - returns `serverUrl` in `unix:<socketPath>` form for downstream transport handling

- `src/server/createDirectConnectSession.ts`
  - Added unix-domain-socket transport for session creation:
    - detects `serverUrl` with `unix:`
    - performs `POST /sessions` via `http.request({ socketPath })`
    - preserves auth header behavior and response schema validation
  - Kept HTTP fetch path unchanged for normal `cc://` hosts.

- `src/server/server.ts`
  - Fixed unix-listen session creation response to avoid malformed `ws_url` containing `:undefined`.
  - In unix mode, now emits a syntactically valid ws URL base (`ws://127.0.0.1/...`) for client compatibility/fallback behavior.

## Validation

- `node scripts/recovery/scan-missing-imports.mjs`
  - unresolved refs/edges/modules: `0`
- `node reconstructed-client/claude-client.mjs --help`
  - executable help output normal.
