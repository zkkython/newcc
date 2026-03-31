import type { StdoutMessage } from 'src/entrypoints/sdk/controlTypes.js'

export type Transport = {
  connect(): Promise<void>
  close(): void
  write(message: StdoutMessage): Promise<void>
  setOnData(callback: (data: string) => void): void
  setOnClose(callback: (closeCode?: number) => void): void
  setOnEvent?(callback: (event: unknown) => void): void
  setOnConnect?(callback: () => void): void
  isConnectedStatus?(): boolean
  isClosedStatus?(): boolean
}
