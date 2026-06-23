import type { ApiResult, MatchStatus } from '@prediction-league/shared'
import { apiFetch } from './client'

export interface MyPrediction {
  predictedHome: number
  predictedAway: number
  predictedAdvancing: 'HOME' | 'AWAY' | null
  /** null until the match is FINISHED */
  points: number | null
  breakdown: 'exact' | 'result' | 'none' | null
}

export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  homeTeamCrestUrl: string | null
  awayTeamCrestUrl: string | null
  kickoffTime: string
  status: MatchStatus
  stage: string | null
  homeScore: number | null
  awayScore: number | null
  myPrediction: MyPrediction | null
}

export async function getMatches(): Promise<ApiResult<{ matches: Match[] }>> {
  return apiFetch<{ matches: Match[] }>('/api/matches')
}
