import { feature } from 'bun:bundle'
import { registerBuiltinPlugin } from '../builtinPlugins.js'

/**
 * Built-in Plugin Initialization
 *
 * Initializes built-in plugins that ship with the CLI and appear in the
 * /plugin UI for users to enable/disable.
 *
 * Not all bundled features should be built-in plugins — use this for
 * features that users should be able to explicitly enable/disable. For
 * features with complex setup or automatic-enabling logic (e.g.
 * claude-in-chrome), use src/skills/bundled/ instead.
 *
 * To add a new built-in plugin:
 * 1. Import registerBuiltinPlugin from '../builtinPlugins.js'
 * 2. Call registerBuiltinPlugin() with the plugin definition here
 */

/**
 * Initialize built-in plugins. Called during CLI startup.
 */
export function initBuiltinPlugins(): void {
  const antDebugEnabled = feature('ANT_DEBUG') ? true : false
  registerBuiltinPlugin({
    name: 'builtin-ops',
    description:
      'Operational helper skill for debugging local Claude Code runtime state.',
    version: '1.0.0',
    defaultEnabled: false,
    isAvailable: () => antDebugEnabled || process.env.USER_TYPE === 'ant',
    skills: [
      {
        name: 'builtin-ops-help',
        description: 'Show built-in operational diagnostics checklist',
        whenToUse:
          'Use when diagnosing local runtime issues (sessions, transports, hooks).',
        userInvocable: true,
        allowedTools: ['Bash'],
        getPromptForCommand: async args => [
          {
            type: 'text',
            text:
              [
                '# Built-in Ops Help',
                '',
                'Run a quick local diagnostics pass for Claude Code runtime:',
                '1. Check active sessions: `claude ps`',
                '2. Check daemon state: `claude daemon status`',
                '3. Verify runner state files under `~/.claude/runners/`',
                '4. Inspect recent recovery docs under `docs/recovery-round*.md`',
                '',
                args.trim() ? `User hint: ${args.trim()}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
          },
        ],
      },
    ],
  })
}
