/**
 * The seven interest labels, in the order the acceptance criteria list them. The label is the
 * wire value; the backend maps it to a stored code. Kept as a literal list because the catalogue
 * endpoint does not exist in this change (non-goal: `tag` / `/api/tags`).
 */
export const INTEREST_LABELS = [
  'Art',
  'Nature',
  'Culture',
  'History',
  'Food',
  'Shopping',
  'Adventure',
] as const

export type InterestLabel = (typeof INTEREST_LABELS)[number]

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
