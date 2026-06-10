import type { ApiResult, ApiError } from '@prediction-league/shared'

export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return (result as ApiError).statusCode !== undefined
}

const TOKEN_KEY = 'wc_access_token'

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function getCurrentUserId(): string | null {
  const token = getToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string }
    return payload.sub ?? null
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      removeToken()
      window.dispatchEvent(new Event('session-expired'))
      return false
    }
    const body = (await res.json()) as { accessToken: string }
    saveToken(body.accessToken)
    return true
  } catch {
    removeToken()
    window.dispatchEvent(new Event('session-expired'))
    return false
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const execute = (token: string) =>
    fetch(path, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((options.headers as Record<string, string>) ?? {}),
      },
    })

  let res = await execute(getToken())

  if (res.status === 401) {
    const ok = await tryRefresh()
    if (ok) res = await execute(getToken())
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    return { error: body.error ?? 'La solicitud falló', statusCode: res.status }
  }

  return { data: (await res.json()) as T }
}
