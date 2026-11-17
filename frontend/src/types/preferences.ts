/**
 * The ten predefined interests, in the order the design prototype lists them. The label is the
 * wire value; the backend maps it to a stored code. The emoji is presentation only and never
 * travels over the wire. Kept as a literal list because the catalogue endpoint does not exist in
 * this change (non-goal: `tag` / `/api/tags`).
 */
export const INTEREST_OPTIONS = [
  { label: '水上运动', emoji: '🌊' },
  { label: '潜水', emoji: '🤿' },
  { label: '摄影', emoji: '📷' },
  { label: '美食', emoji: '🍜' },
  { label: '咖啡', emoji: '☕' },
  { label: '历史人文', emoji: '🏛️' },
  { label: '手作', emoji: '🧶' },
  { label: '自然风景', emoji: '🏞️' },
  { label: '冒险', emoji: '🧗' },
  { label: '慢游', emoji: '🚶' },
] as const

export type InterestLabel = (typeof INTEREST_OPTIONS)[number]['label']

export const INTEREST_LABELS: InterestLabel[] = INTEREST_OPTIONS.map((option) => option.label)

export interface MemberPreferences {
  userId: number
  interests: string[]
}

export interface PreferencesResponse {
  members: MemberPreferences[]
}

export interface SavePreferencesResponse {
  interests: string[]
}

/**
 * One must-do item (US-020). `null` location or time means "not given"; the server stores and
 * returns the explicit null (C4). `id` is `null` only for an item the server has not issued an id
 * for yet — the page never appends a local id, it adopts the response (PAGE-6).
 */
export interface MustDoItem {
  id: number | null
  activity: string
  location: string | null
  time: string | null
}

export interface MustDoMember {
  userId: number
  mustDos: MustDoItem[]
}

export interface MustDosResponse {
  members: MustDoMember[]
}

export interface SaveMustDosResponse {
  items: MustDoItem[]
}

// US-024 (revised): budget amount is a whole number of MAJOR currency units.
export const BUDGET_CURRENCIES = ['SGD', 'CNY', 'USD', 'EUR', 'JPY'] as const
export type BudgetCurrency = (typeof BUDGET_CURRENCIES)[number]
export type BudgetLimitType = 'hard' | 'soft'

export interface Budget {
  amount: number
  currency: string
  limitType: BudgetLimitType
}

export interface BudgetMember {
  userId: number
  budget: Budget | null
}

export interface BudgetsResponse {
  members: BudgetMember[]
}

export interface SaveBudgetResponse {
  budget: Budget | null
}

// US-026: per-member readiness / submission.
export interface ReadinessMember {
  userId: number
  status: 'ready' | 'pending'
  noPreference: boolean
}

export interface ReadinessResponse {
  members: ReadinessMember[]
  readyCount: number
  memberCount: number
  allReady: boolean
}

export interface SubmissionResponse {
  status: string
  noPreference: boolean
  submittedAt: string
}

// US-019: a user's personal default interests.
export interface UserInterestsResponse {
  interests: string[]
}
