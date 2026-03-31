import { randomUUID } from 'crypto'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Message } from '../../types/message.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { getContentText } from '../../utils/messages.js'
import { submitTranscriptShare } from './submitTranscriptShare.js'
import type { TranscriptShareResponse } from './TranscriptSharePrompt.js'

type FrustrationState = 'closed' | 'transcript_prompt' | 'submitting' | 'submitted'

const FRUSTRATION_RE =
  /\b(frustrat|annoy|angry|useless|broken|still\s+not\s+work|not\s+working|hate\s+this|terrible)\b/i
const CLOSE_DELAY_MS = 3000

function getLastUserMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.type === 'user') return m
  }
  return null
}

export function useFrustrationDetection(
  messages: Message[],
  isLoading: boolean,
  hasActivePrompt = false,
  hasOtherSurveyOpen = false,
): {
  state: FrustrationState
  handleTranscriptSelect: (selected: TranscriptShareResponse) => void
} {
  const [state, setState] = useState<FrustrationState>('closed')
  const seenUserMessageIds = useRef(new Set<string>())
  const appearanceId = useRef(randomUUID())
  const messagesRef = useRef(messages)
  messagesRef.current = messages

  const lastUser = useMemo(() => getLastUserMessage(messages), [messages])

  useEffect(() => {
    if (state !== 'closed' || isLoading || hasActivePrompt || hasOtherSurveyOpen) {
      return
    }
    if (getGlobalConfig().transcriptShareDismissed) {
      return
    }

    const message = lastUser
    if (!message) return
    const id = String(message.uuid ?? '')
    if (id && seenUserMessageIds.current.has(id)) return

    const payload =
      (message as { message?: { content?: unknown } }).message?.content ??
      (message as { content?: unknown }).content
    const text = getContentText(
      payload as string | ReadonlyArray<{ readonly type: string }>,
    )?.trim()
    if (!text) return
    if (!FRUSTRATION_RE.test(text)) return

    if (id) seenUserMessageIds.current.add(id)
    appearanceId.current = randomUUID()
    setState('transcript_prompt')
  }, [state, isLoading, hasActivePrompt, hasOtherSurveyOpen, lastUser])

  const closeSoon = useCallback(() => {
    setTimeout(() => setState('closed'), CLOSE_DELAY_MS)
  }, [])

  const handleTranscriptSelect = useCallback(
    (selected: TranscriptShareResponse) => {
      if (selected === 'dont_ask_again') {
        saveGlobalConfig(current => ({
          ...current,
          transcriptShareDismissed: true,
        }))
      }
      if (selected !== 'yes') {
        setState('closed')
        return
      }

      setState('submitting')
      void submitTranscriptShare(
        messagesRef.current,
        'frustration',
        appearanceId.current,
      ).then(result => {
        setState(result.success ? 'submitted' : 'closed')
        if (result.success) {
          closeSoon()
        }
      })
    },
    [closeSoon],
  )

  return {
    state,
    handleTranscriptSelect,
  }
}
