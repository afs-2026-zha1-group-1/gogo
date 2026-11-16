// Type surface of the shared api.js fetch helper (US-065 partial migration:
// the implementation stays JS; this declaration types it for the TS pages).
// Wire payloads are generic because each endpoint returns its own shape.

export interface DemoUser {
  id: number
  name: string
}

export interface ApiOptions {
  userId?: number
  method?: string
  body?: unknown
}

export interface ApiEnvelope {
  status: number
  ok: boolean
  data: unknown
}

export function users(): DemoUser[]
export function api(path: string, options?: ApiOptions): Promise<ApiEnvelope>
export function getMainPlanInputs(tripId: number, userId: number): Promise<ApiEnvelope>
export function generateMainPlan(tripId: number, userId: number): Promise<ApiEnvelope>
export function getMainPlan(tripId: number, userId: number): Promise<ApiEnvelope>
export function confirmMainPlan(tripId: number, userId: number): Promise<ApiEnvelope>