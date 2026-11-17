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
