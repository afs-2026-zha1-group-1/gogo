import type { ApiResult } from './mainPlan'
import type { ApiEnvelope } from '../api.js'

// The one boundary between the untyped api.js envelope and the contractual
// wire types: success bodies are the endpoint projection, error bodies are
// MainPlanError. The backend status codes guarantee which shape arrives.
export function typed<T>(result: ApiEnvelope): ApiResult<T> {
  return result as ApiResult<T>
}