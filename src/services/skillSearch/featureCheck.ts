import { isEnvTruthy } from '../../utils/envUtils.js'

export function isSkillSearchEnabled(): boolean {
  if (isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_SKILL_SEARCH)) return false
  if (isEnvTruthy(process.env.CLAUDE_CODE_FORCE_SKILL_SEARCH)) return true
  return process.env.USER_TYPE === 'ant'
}
