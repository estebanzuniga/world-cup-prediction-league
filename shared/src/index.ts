export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

export interface ApiSuccess<T> {
  data: T
  error?: never
}

export interface ApiError {
  data?: never
  error: string
  statusCode: number
}

export type ApiResult<T> = ApiSuccess<T> | ApiError
