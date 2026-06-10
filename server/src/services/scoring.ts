export interface ScoreResult {
  points: number
  breakdown: 'exact' | 'result' | 'none'
}

function getOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

export function calculatePoints(
  prediction: { predictedHome: number; predictedAway: number },
  result: { homeScore: number; awayScore: number }
): ScoreResult {
  const exactMatch =
    prediction.predictedHome === result.homeScore &&
    prediction.predictedAway === result.awayScore

  if (exactMatch) {
    return { points: 3, breakdown: 'exact' }
  }

  const predictedOutcome = getOutcome(prediction.predictedHome, prediction.predictedAway)
  const actualOutcome = getOutcome(result.homeScore, result.awayScore)

  if (predictedOutcome === actualOutcome) {
    return { points: 1, breakdown: 'result' }
  }

  return { points: 0, breakdown: 'none' }
}
