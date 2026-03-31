import type { ReactNode } from 'react'

export type Option = {
  label: ReactNode | string
  value: string
  description?: string
  disabled?: boolean
}
