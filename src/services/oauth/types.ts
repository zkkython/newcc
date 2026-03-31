export type SubscriptionType = 'max' | 'pro' | 'team' | 'enterprise'

export type RateLimitTier = string

export type BillingType = string

export type OAuthProfileResponse = {
  account?: {
    uuid?: string
    email_address?: string
    display_name?: string
    created_at?: string
  }
  organization?: {
    uuid?: string
    organization_type?: string
    rate_limit_tier?: RateLimitTier
    has_extra_usage_enabled?: boolean
    billing_type?: BillingType
    subscription_created_at?: string
  }
}

export type OAuthTokenExchangeResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  token_type?: string
  account?: {
    uuid: string
    email_address: string
  }
  organization?: {
    uuid?: string
  }
}

export type OAuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scopes: string[]
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier | null
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
}

export type UserRolesResponse = {
  organization_role?: string
  workspace_role?: string
  organization_name?: string
}

export type ReferrerRewardInfo = {
  amount_minor_units: number
  currency: string
}

export type ReferralRedemptionsResponse = {
  total_redemptions?: number
  redemptions?: unknown[]
  [key: string]: unknown
}

export type ReferralCampaign = 'claude_code_guest_pass' | (string & {})

export type ReferralEligibilityResponse = {
  eligible: boolean
  remaining_passes?: number
  referrer_reward?: ReferrerRewardInfo | null
  [key: string]: unknown
}
