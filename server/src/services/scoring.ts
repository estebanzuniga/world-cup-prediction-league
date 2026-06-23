export type Breakdown = 'exact' | 'result' | 'adv_diff' | 'adv_only' | 'one_team' | 'none'

export interface ScoreResult {
  points: number
  breakdown: Breakdown
  emoji: string
}

const KNOCKOUT_STAGES = new Set(['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'])

const STAGE_SCORING = {
  LAST_32:        { exact: 5, adv_diff: 3, adv_only: 2, one_team: 1 },
  LAST_16:        { exact: 6, adv_diff: 4, adv_only: 3, one_team: 1 },
  QUARTER_FINALS: { exact: 7, adv_diff: 5, adv_only: 3, one_team: 2 },
  SEMI_FINALS:    { exact: 8, adv_diff: 6, adv_only: 4, one_team: 2 },
  THIRD_PLACE:    { exact: 8, adv_diff: 6, adv_only: 4, one_team: 2 },
  FINAL:          { exact: 10, adv_diff: 7, adv_only: 5, one_team: 3 },
} as const

const BREAKDOWN_EMOJI: Record<Breakdown, string> = {
  exact:    '🎯',
  adv_diff: '⭐',
  adv_only: '✅',
  result:   '✅',
  one_team: '✅',
  none:     '❌',
}

function score(points: number, breakdown: Breakdown): ScoreResult {
  return { points, breakdown, emoji: BREAKDOWN_EMOJI[breakdown] }
}

function getOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function calculatePoints(
  prediction: { predictedHome: number; predictedAway: number; predictedAdvancing?: string | null },
  result: { homeScore: number; awayScore: number },
  options?: { stage?: string | null; advancingTeam?: string | null }
): ScoreResult {
  const { predictedHome, predictedAway } = prediction
  const { homeScore, awayScore } = result
  const stage = options?.stage ?? null
  const advancingTeam = options?.advancingTeam ?? null

  // Group stage or unknown stage: original 3 / 1 / 0 logic
  if (!stage || !KNOCKOUT_STAGES.has(stage)) {
    if (predictedHome === homeScore && predictedAway === awayScore) {
      return score(3, 'exact')
    }
    if (getOutcome(predictedHome, predictedAway) === getOutcome(homeScore, awayScore)) {
      return score(1, 'result')
    }
    return score(0, 'none')
  }

  const tiers = STAGE_SCORING[stage as keyof typeof STAGE_SCORING]

  // Actual advancing team: for decisive games derive from score; for draws use DB field
  const isActualDraw = homeScore === awayScore
  const actualAdvancer: 'HOME' | 'AWAY' | null = !isActualDraw
    ? (homeScore > awayScore ? 'HOME' : 'AWAY')
    : (advancingTeam as 'HOME' | 'AWAY' | null)

  // Predicted advancing team: for decisive predictions derive from score; for draws use stored pick
  const isPredictedDraw = predictedHome === predictedAway
  const predictedAdvancer: 'HOME' | 'AWAY' | null = !isPredictedDraw
    ? (predictedHome > predictedAway ? 'HOME' : 'AWAY')
    : ((prediction.predictedAdvancing as 'HOME' | 'AWAY' | null) ?? null)

  const isExactScore = predictedHome === homeScore && predictedAway === awayScore
  const isAdvancingCorrect = actualAdvancer !== null && predictedAdvancer === actualAdvancer

  // Draw vs draw: 4-case rules (no one_team tier, margins are always 0)
  if (isActualDraw && isPredictedDraw) {
    if (isExactScore && isAdvancingCorrect) return score(tiers.exact, 'exact')
    if (isExactScore || isAdvancingCorrect) return score(tiers.adv_diff, 'adv_diff')
    return score(0, 'none')
  }

  // Decisive game (or mixed: decisive pred on draw result / draw pred on decisive result)
  const isMarginCorrect = Math.abs(predictedHome - predictedAway) === Math.abs(homeScore - awayScore)
  const isOneTeamCorrect = predictedHome === homeScore || predictedAway === awayScore

  if (isExactScore && isAdvancingCorrect) return score(tiers.exact, 'exact')
  if (isAdvancingCorrect && isMarginCorrect) return score(tiers.adv_diff, 'adv_diff')
  if (isAdvancingCorrect) return score(tiers.adv_only, 'adv_only')
  if (isOneTeamCorrect) return score(tiers.one_team, 'one_team')

  return score(0, 'none')
}
