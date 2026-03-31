export type FeedbackSurveyResponse = 'dismissed' | 'bad' | 'fine' | 'good'

export const FEEDBACK_SURVEY_RESPONSES: readonly FeedbackSurveyResponse[] = [
  'dismissed',
  'bad',
  'fine',
  'good',
]

export type FeedbackSurveyType =
  | 'session'
  | 'memory'
  | 'post_compact'
  | 'frustration'
  | string
