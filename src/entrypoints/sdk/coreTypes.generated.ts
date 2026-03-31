import type { z } from 'zod/v4'
import {
  ExitReasonSchema,
  HookEventSchema,
  HookInputSchema,
  HookJSONOutputSchema,
  ModelUsageSchema,
  PermissionModeSchema,
  PermissionResultSchema,
  SDKAssistantMessageErrorSchema,
  SDKAssistantMessageSchema,
  SDKCompactBoundaryMessageSchema,
  SDKMessageSchema,
  SDKPartialAssistantMessageSchema,
  SDKPermissionDenialSchema,
  SDKResultMessageSchema,
  SDKResultSuccessSchema,
  SDKSessionInfoSchema,
  SDKStatusMessageSchema,
  SDKStatusSchema,
  SDKSystemMessageSchema,
  SDKToolProgressMessageSchema,
  SDKUserMessageReplaySchema,
  SDKUserMessageSchema,
} from './coreSchemas.js'

export type ModelUsage = z.infer<ReturnType<typeof ModelUsageSchema>>
export type PermissionMode = z.infer<ReturnType<typeof PermissionModeSchema>>
export type PermissionResult = z.infer<ReturnType<typeof PermissionResultSchema>>
export type HookEvent = z.infer<ReturnType<typeof HookEventSchema>>
export type HookInput = z.infer<ReturnType<typeof HookInputSchema>>
export type HookJSONOutput = z.infer<ReturnType<typeof HookJSONOutputSchema>>
export type ExitReason = z.infer<ReturnType<typeof ExitReasonSchema>>

export type SDKAssistantMessageError = z.infer<
  ReturnType<typeof SDKAssistantMessageErrorSchema>
>
export type SDKStatus = z.infer<ReturnType<typeof SDKStatusSchema>>
export type SDKUserMessage = z.infer<ReturnType<typeof SDKUserMessageSchema>>
export type SDKUserMessageReplay = z.infer<
  ReturnType<typeof SDKUserMessageReplaySchema>
>
export type SDKAssistantMessage = z.infer<
  ReturnType<typeof SDKAssistantMessageSchema>
>
export type SDKPartialAssistantMessage = z.infer<
  ReturnType<typeof SDKPartialAssistantMessageSchema>
>
export type SDKPermissionDenial = z.infer<
  ReturnType<typeof SDKPermissionDenialSchema>
>
export type SDKResultSuccess = z.infer<
  ReturnType<typeof SDKResultSuccessSchema>
>
export type SDKResultMessage = z.infer<ReturnType<typeof SDKResultMessageSchema>>
export type SDKSystemMessage = z.infer<ReturnType<typeof SDKSystemMessageSchema>>
export type SDKCompactBoundaryMessage = z.infer<
  ReturnType<typeof SDKCompactBoundaryMessageSchema>
>
export type SDKStatusMessage = z.infer<ReturnType<typeof SDKStatusMessageSchema>>
export type SDKToolProgressMessage = z.infer<
  ReturnType<typeof SDKToolProgressMessageSchema>
>
export type SDKSessionInfo = z.infer<ReturnType<typeof SDKSessionInfoSchema>>
export type SDKMessage = z.infer<ReturnType<typeof SDKMessageSchema>>
