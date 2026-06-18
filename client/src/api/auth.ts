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

export async function forgotPassword(email: string): Promise<ApiResult<{ message: string }>> {
  return apiFetch<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<ApiResult<{ message: string }>> {
  return apiFetch<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}
