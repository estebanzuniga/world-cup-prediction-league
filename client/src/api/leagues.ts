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

export async function joinLeague(
  inviteCode: string,
): Promise<ApiResult<{ league: League }>> {
  return apiFetch<{ league: League }>('/api/leagues/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
}
