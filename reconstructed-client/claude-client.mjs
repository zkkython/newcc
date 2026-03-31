#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import readline from 'node:readline/promises';

const exec = promisify(execCb);

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const DEFAULT_MAX_TOKENS = 2048;
const HISTORY_BASE =
  process.env.CLAUDE_REPRO_HOME || process.env.XDG_STATE_HOME || path.join(process.cwd(), '.claude-repro');
const HISTORY_DIR = path.resolve(HISTORY_BASE);
const SESSION_FILE = path.join(HISTORY_DIR, 'session.json');

function usage() {
  console.log(`claude-client (reconstructed)

Usage:
  node claude-client.mjs [options]

Options:
  -m, --model <name>       model name (default: ${DEFAULT_MODEL})
  -p, --prompt <text>      run single prompt then exit
      --allow-tools        auto-allow all tool calls
      --no-tools           disable tools
      --max-tokens <n>     max output tokens per request
  -h, --help               show help
`);
}

function parseArgs(argv) {
  const out = {
    model: DEFAULT_MODEL,
    prompt: null,
    allowTools: false,
    toolsEnabled: true,
    maxTokens: DEFAULT_MAX_TOKENS,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      out.help = true;
    } else if (a === '-m' || a === '--model') {
      out.model = argv[++i];
    } else if (a === '-p' || a === '--prompt') {
      out.prompt = argv[++i];
    } else if (a === '--allow-tools') {
      out.allowTools = true;
    } else if (a === '--no-tools') {
      out.toolsEnabled = false;
    } else if (a === '--max-tokens') {
      out.maxTokens = Number(argv[++i] || DEFAULT_MAX_TOKENS) || DEFAULT_MAX_TOKENS;
    } else {
      throw new Error(`Unknown option: ${a}`);
    }
  }

  return out;
}

function wildcardToRegex(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

async function walkFiles(rootDir, files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function runTool(name, input, cwd) {
  if (name === 'bash') {
    const { command = '' } = input;
    if (!command.trim()) return 'bash: empty command';
    const { stdout, stderr } = await exec(command, { cwd, timeout: 15000, maxBuffer: 1024 * 1024 });
    return [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
  }

  if (name === 'read_file') {
    const file = path.resolve(cwd, input.path || '');
    const content = await fs.readFile(file, 'utf8');
    return content;
  }

  if (name === 'write_file') {
    const file = path.resolve(cwd, input.path || '');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, String(input.content ?? ''), 'utf8');
    return `wrote ${file}`;
  }

  if (name === 'edit_file') {
    const file = path.resolve(cwd, input.path || '');
    const search = String(input.search ?? '');
    const replace = String(input.replace ?? '');
    if (!search) return 'edit_file: search is empty';
    const old = await fs.readFile(file, 'utf8');
    if (!old.includes(search)) return 'edit_file: pattern not found';
    const next = old.replace(search, replace);
    await fs.writeFile(file, next, 'utf8');
    return `edited ${file}`;
  }

  if (name === 'glob') {
    const base = path.resolve(cwd, input.base || '.');
    const pattern = String(input.pattern || '*');
    const re = wildcardToRegex(pattern);
    const files = await walkFiles(base);
    const rel = files.map(f => path.relative(base, f)).filter(f => re.test(f));
    return rel.slice(0, 200).join('\n') || '(no matches)';
  }

  if (name === 'grep') {
    const base = path.resolve(cwd, input.base || '.');
    const pattern = new RegExp(String(input.pattern || ''), 'i');
    if (!String(input.pattern || '').trim()) return 'grep: empty pattern';
    const files = await walkFiles(base);
    const hits = [];
    for (const file of files.slice(0, 3000)) {
      let text = '';
      try {
        text = await fs.readFile(file, 'utf8');
      } catch {
        continue;
      }
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (pattern.test(lines[i])) {
          hits.push(`${path.relative(base, file)}:${i + 1}: ${lines[i].slice(0, 220)}`);
          if (hits.length >= 200) break;
        }
      }
      if (hits.length >= 200) break;
    }
    return hits.join('\n') || '(no matches)';
  }

  return `unknown tool: ${name}`;
}

function getToolSpecs() {
  return [
    {
      name: 'bash',
      description: 'Run a shell command in current working directory.',
      input_schema: {
        type: 'object',
        properties: { command: { type: 'string' } },
        required: ['command'],
      },
    },
    {
      name: 'read_file',
      description: 'Read UTF-8 text file.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Write UTF-8 file content.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
    },
    {
      name: 'edit_file',
      description: 'Replace first matching string in a UTF-8 file.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          search: { type: 'string' },
          replace: { type: 'string' },
        },
        required: ['path', 'search', 'replace'],
      },
    },
    {
      name: 'glob',
      description: 'Find files by wildcard pattern (* and ?).',
      input_schema: {
        type: 'object',
        properties: { base: { type: 'string' }, pattern: { type: 'string' } },
        required: ['pattern'],
      },
    },
    {
      name: 'grep',
      description: 'Search text content by regex pattern.',
      input_schema: {
        type: 'object',
        properties: { base: { type: 'string' }, pattern: { type: 'string' } },
        required: ['pattern'],
      },
    },
  ];
}

async function anthropicMessages({ apiKey, model, messages, tools, maxTokens }) {
  const payload = {
    model,
    max_tokens: maxTokens,
    messages,
    tools,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Anthropic API error: ${msg}`);
  }
  return data;
}

function extractTextBlocks(content) {
  return (content || [])
    .filter(c => c.type === 'text')
    .map(c => c.text)
    .join('\n')
    .trim();
}

async function ensureHistoryDir() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

async function saveSession(messages, model) {
  await ensureHistoryDir();
  await fs.writeFile(SESSION_FILE, JSON.stringify({ model, messages }, null, 2), 'utf8');
}

async function loadSession() {
  const raw = await fs.readFile(SESSION_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    model: parsed.model || DEFAULT_MODEL,
    messages: Array.isArray(parsed.messages) ? parsed.messages : [],
  };
}

async function runPrompt({ state, prompt, rl, options }) {
  const { apiKey } = state;
  state.messages.push({ role: 'user', content: prompt });

  while (true) {
    const tools = options.toolsEnabled ? getToolSpecs() : undefined;
    const resp = await anthropicMessages({
      apiKey,
      model: state.model,
      messages: state.messages,
      tools,
      maxTokens: options.maxTokens,
    });

    state.messages.push({ role: 'assistant', content: resp.content });

    const toolUses = (resp.content || []).filter(c => c.type === 'tool_use');
    const text = extractTextBlocks(resp.content);
    if (text) console.log(`\nAssistant:\n${text}\n`);

    if (toolUses.length === 0) break;

    const toolResults = [];
    for (const call of toolUses) {
      const input = call.input || {};
      const name = call.name;

      let allowed = options.allowTools;
      if (!allowed) {
        const ask = `Allow tool ${name}(${JSON.stringify(input)}) ? [y/N] `;
        const ans = await rl.question(ask);
        allowed = ans.trim().toLowerCase() === 'y';
      }

      let resultText;
      if (!allowed) {
        resultText = 'Denied by user';
      } else {
        try {
          resultText = await runTool(name, input, process.cwd());
        } catch (err) {
          resultText = `Tool error: ${err instanceof Error ? err.message : String(err)}`;
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: String(resultText).slice(0, 50000),
      });
    }

    state.messages.push({ role: 'user', content: toolResults });
  }

  await saveSession(state.messages, state.model);
}

function printHelpInline() {
  console.log(`
Commands:
  /help                show commands
  /model <name>        switch model
  /history             print message count
  /clear               clear current conversation
  /save                save session
  /load                load session
  /tools on|off        enable/disable tools
  /exit                quit
`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err.message || err));
    usage();
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    usage();
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exitCode = 1;
    return;
  }

  await ensureHistoryDir();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const state = {
    apiKey,
    model: options.model,
    messages: [],
  };

  if (options.prompt) {
    try {
      await runPrompt({ state, prompt: options.prompt, rl, options });
    } catch (err) {
      console.error(`request failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
    rl.close();
    return;
  }

  console.log(`claude-client (reconstructed) | model=${state.model}`);
  printHelpInline();

  while (true) {
    const line = (await rl.question('you> ')).trim();
    if (!line) continue;

    if (line.startsWith('/')) {
      const [cmd, ...rest] = line.split(/\s+/);
      if (cmd === '/exit') break;
      if (cmd === '/help') {
        printHelpInline();
        continue;
      }
      if (cmd === '/model') {
        if (!rest[0]) {
          console.log(`current model: ${state.model}`);
        } else {
          state.model = rest[0];
          console.log(`model set: ${state.model}`);
        }
        continue;
      }
      if (cmd === '/history') {
        console.log(`messages: ${state.messages.length}`);
        continue;
      }
      if (cmd === '/clear') {
        state.messages = [];
        console.log('conversation cleared');
        continue;
      }
      if (cmd === '/save') {
        await saveSession(state.messages, state.model);
        console.log(`saved: ${SESSION_FILE}`);
        continue;
      }
      if (cmd === '/load') {
        try {
          const loaded = await loadSession();
          state.model = loaded.model;
          state.messages = loaded.messages;
          console.log(`loaded: ${SESSION_FILE} (messages=${state.messages.length}, model=${state.model})`);
        } catch (err) {
          console.log(`load failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        continue;
      }
      if (cmd === '/tools') {
        const arg = (rest[0] || '').toLowerCase();
        if (arg === 'on') options.toolsEnabled = true;
        if (arg === 'off') options.toolsEnabled = false;
        console.log(`tools: ${options.toolsEnabled ? 'on' : 'off'}`);
        continue;
      }

      console.log(`unknown command: ${cmd}`);
      continue;
    }

    try {
      await runPrompt({ state, prompt: line, rl, options });
    } catch (err) {
      console.error(`request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  rl.close();
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exitCode = 1;
});
