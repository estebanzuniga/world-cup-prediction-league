import type { ApiResult } from '@prediction-league/shared'
import { apiFetch } from './client'

export interface League {
  id: string
  name: string
  inviteCode: string
  createdAt: string
  createdBy: string
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatarUrl: string | null
  avatarColor: string | null
  totalPoints: number
  predictionsCount: number
  exactScoreCount: number
}

export async function getMyLeagues(): Promise<ApiResult<{ leagues: League[] }>> {
  return apiFetch<{ leagues: League[] }>('/api/leagues')
}

export async function getLeaderboard(
  leagueId: string,
): Promise<ApiResult<{ leaderboard: LeaderboardEntry[] }>> {
  return apiFetch<{ leaderboard: LeaderboardEntry[] }>(
    `/api/leagues/${leagueId}/leaderboard`,
  )
}

export interface MemberPrediction {
  userId: string
  predictedHome: number
  predictedAway: number
  points: number
  breakdown: 'exact' | 'result' | 'none'
}

export interface FinishedMatchWithPredictions {
  id: string
  homeTeam: string
  awayTeam: string
  kickoffTime: string
  homeScore: number
  awayScore: number
  predictions: MemberPrediction[]
}

export async function getLeaguePredictions(
  leagueId: string,
): Promise<ApiResult<{ matches: FinishedMatchWithPredictions[] }>> {
  return apiFetch<{ matches: FinishedMatchWithPredictions[] }>(
    `/api/leagues/${leagueId}/predictions`,
  )
}

export async function joinLeague(
  inviteCode: string,
): Promise<ApiResult<{ league: League }>> {
  return apiFetch<{ league: League }>('/api/leagues/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
}
