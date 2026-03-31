// Reconstructed control-protocol types used across bridge/remote/cli layers.

export type SDKControlPermissionRequest = {
  subtype?: 'can_use_tool' | string
  [key: string]: unknown
}

export type SDKControlRequestInner = {
  subtype?: string
  [key: string]: unknown
}

export type SDKControlRequest = {
  type: 'control_request'
  request_id: string
  request: SDKControlRequestInner
}

export type SDKControlResponse = {
  type: 'control_response'
  request_id: string
  response: {
    subtype?: string
    [key: string]: unknown
  }
}

export type SDKControlCancelRequest = {
  type: 'control_cancel_request'
  request_id: string
}

export type StdoutMessage =
  | SDKControlRequest
  | SDKControlResponse
  | SDKControlCancelRequest
  | {
      type: string
      [key: string]: unknown
    }
