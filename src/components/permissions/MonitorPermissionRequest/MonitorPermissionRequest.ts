import type React from 'react'
import { FallbackPermissionRequest } from '../FallbackPermissionRequest.js'
import type { PermissionRequestProps } from '../PermissionRequest.js'

export function MonitorPermissionRequest(
  props: PermissionRequestProps,
): React.ReactNode {
  return FallbackPermissionRequest(props)
}
