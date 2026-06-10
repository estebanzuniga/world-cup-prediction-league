import type { ApiResult } from '@prediction-league/shared'
import { apiFetch } from './client'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarColor: string | null
}

export async function getMe(): Promise<ApiResult<{ user: UserProfile }>> {
  return apiFetch<{ user: UserProfile }>('/api/users/me')
}

export async function updateAvatarColor(
  avatarColor: string,
): Promise<ApiResult<{ user: { id: string; avatarColor: string } }>> {
  return apiFetch('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ avatarColor }),
  })
}
