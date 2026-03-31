# Reconstructed Claude Client

This is a runnable reconstruction client built from the architecture observed in `src/` snapshot.

## Features

- Claude Messages API chat loop
- Interactive REPL and one-shot prompt mode
- Tool call loop (`bash`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`)
- Tool permission prompt (or `--allow-tools`)
- Conversation save/load
- Slash commands (`/help`, `/model`, `/history`, `/clear`, `/save`, `/load`, `/tools`, `/exit`)

## Run

```bash
cd reconstructed-client
ANTHROPIC_API_KEY=your_key node claude-client.mjs
```

One-shot:

```bash
ANTHROPIC_API_KEY=your_key node claude-client.mjs -p "summarize this repo"
```

## Notes

- This is a practical reconstruction, not a byte-for-byte rebuild of internal proprietary modules.
- Default model: `claude-sonnet-4-5`.
- Session file path: `$CLAUDE_REPRO_HOME/session.json` (default `./.claude-repro/session.json`).
