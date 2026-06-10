import type { ApiResult, MatchStatus } from '@prediction-league/shared'
import { apiFetch } from './client'

export interface MyPrediction {
  predictedHome: number
  predictedAway: number
  points: number
  breakdown: 'exact' | 'result' | 'none'
}

export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  kickoffTime: string
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  myPrediction: MyPrediction | null
}

export async function getMatches(): Promise<ApiResult<{ matches: Match[] }>> {
  return apiFetch<{ matches: Match[] }>('/api/matches')
}
