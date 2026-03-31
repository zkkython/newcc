import { mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import React from 'react'
import { Box, Text } from '../../ink.js'
import { Select } from '../../components/CustomSelect/index.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import type { Command } from '../../commands.js'

export async function computeDefaultInstallDir(): Promise<string> {
  return join(homedir(), '.claude', 'assistant')
}

type NewInstallWizardProps = {
  defaultDir: string
  onInstalled: (dir: string) => void
  onCancel: () => void
  onError: (message: string) => void
}

export function NewInstallWizard({
  defaultDir,
  onInstalled,
  onCancel,
  onError,
}: NewInstallWizardProps): React.ReactNode {
  return (
    <Dialog title="Install Assistant" onCancel={onCancel}>
      <Box flexDirection="column" gap={1}>
        <Text>Install directory:</Text>
        <Text dimColor>{defaultDir}</Text>
        <Select
          options={[
            { value: 'install', label: 'Install' },
            { value: 'cancel', label: 'Cancel' },
          ]}
          onChange={value => {
            if (value === 'cancel') {
              onCancel()
              return
            }
            try {
              mkdirSync(defaultDir, { recursive: true })
              onInstalled(defaultDir)
            } catch (e) {
              onError(e instanceof Error ? e.message : String(e))
            }
          }}
        />
      </Box>
    </Dialog>
  )
}

async function call(
  onDone: (result?: string) => void,
): Promise<React.ReactNode> {
  const defaultDir = await computeDefaultInstallDir()
  return (
    <NewInstallWizard
      defaultDir={defaultDir}
      onInstalled={dir => onDone(`Assistant installed at ${dir}`)}
      onCancel={() => onDone('Assistant installation cancelled')}
      onError={message => onDone(`Assistant installation failed: ${message}`)}
    />
  )
}

const command: Command = {
  type: 'local-jsx',
  name: 'assistant',
  description: 'Install or manage assistant mode',
  load: async () => ({ call }),
}

export default command
