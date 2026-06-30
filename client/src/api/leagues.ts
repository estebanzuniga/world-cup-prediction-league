import type { ApiResult } from '@prediction-league/shared'
import { apiFetch } from './client'

export interface League {
  id: string
  name: string
  createdAt: string
  createdBy: string
}

export interface InviteToken {
  token: string
  expiresAt: string
  usedAt: string | null
}

export interface LeaderboardEntry {
  userId: string
  name: string
  avatarUrl: string | null
  avatarColor: string | null
  totalPoints: number
  predictionsCount: number
  exactScoreCount: number
  position: number
}

export interface MemberPrediction {
  userId: string
  predictedHome: number
  predictedAway: number
  predictedAdvancing: string | null
  points: number | null
  breakdown: 'exact' | 'result' | 'adv_diff' | 'adv_only' | 'one_team' | 'none' | null
}

export interface FinishedMatchWithPredictions {
  id: string
  homeTeam: string
  awayTeam: string
  homeTeamCrestUrl: string | null
  awayTeamCrestUrl: string | null
  kickoffTime: string
  status: string
  stage: string | null
  homeScore: number | null
  awayScore: number | null
  predictions: MemberPrediction[]
}

export async function getMyLeagues(): Promise<ApiResult<{ leagues: League[] }>> {
  return apiFetch<{ leagues: League[] }>('/api/leagues')
}

export async function getLeaderboard(leagueId: string): Promise<ApiResult<{ leaderboard: LeaderboardEntry[] }>> {
  return apiFetch<{ leaderboard: LeaderboardEntry[] }>(`/api/leagues/${leagueId}/leaderboard`)
}

export async function getLeaguePredictions(leagueId: string): Promise<ApiResult<{ matches: FinishedMatchWithPredictions[] }>> {
  return apiFetch<{ matches: FinishedMatchWithPredictions[] }>(`/api/leagues/${leagueId}/predictions`)
}

export interface HistoryMember {
  userId: string
  name: string
  avatarUrl: string | null
  avatarColor: string | null
}

export interface HistoryDataPoint {
  matchId: string
  label: string
  kickoffTime: string
  cumulative: Record<string, number>
}

export async function getLeagueHistory(leagueId: string): Promise<ApiResult<{ members: HistoryMember[]; history: HistoryDataPoint[] }>> {
  return apiFetch<{ members: HistoryMember[]; history: HistoryDataPoint[] }>(`/api/leagues/${leagueId}/history`)
}

export async function joinLeague(token: string): Promise<ApiResult<{ league: League }>> {
  return apiFetch<{ league: League }>('/api/leagues/join', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function createInviteToken(leagueId: string): Promise<ApiResult<InviteToken>> {
  return apiFetch<InviteToken>(`/api/leagues/${leagueId}/invite-tokens`, { method: 'POST' })
}

export async function getInviteTokens(leagueId: string): Promise<ApiResult<{ tokens: InviteToken[] }>> {
  return apiFetch<{ tokens: InviteToken[] }>(`/api/leagues/${leagueId}/invite-tokens`)
}
