import type { ApiResult } from '@prediction-league/shared'
import { apiFetch } from './client'

export async function login(
  email: string,
  password: string,
): Promise<ApiResult<{ accessToken: string }>> {
  return apiFetch<{ accessToken: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}
