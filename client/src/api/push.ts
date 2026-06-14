import { apiFetch } from './client'
import type { ApiResult } from '@prediction-league/shared'

interface SubscribeBody {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export function subscribePush(body: SubscribeBody): Promise<ApiResult<{ ok: boolean }>> {
  return apiFetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(body) })
}

export function unsubscribePush(body: { endpoint: string }): Promise<ApiResult<{ ok: boolean }>> {
  return apiFetch('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify(body) })
}
