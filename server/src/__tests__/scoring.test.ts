import { describe, it, expect } from 'vitest'
import { calculatePoints } from '../services/scoring'

describe('calculatePoints', () => {
  // ── Exact score (3 pts) ───────────────────────────────────────────────────

  it('awards 3 points for an exact home win', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 3, awayScore: 1 }))
      .toEqual({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact draw', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 1 }, { homeScore: 1, awayScore: 1 }))
      .toEqual({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact away win', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 2 }, { homeScore: 0, awayScore: 2 }))
      .toEqual({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact 0-0 draw', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 0 }, { homeScore: 0, awayScore: 0 }))
      .toEqual({ points: 3, breakdown: 'exact' })
  })

  // ── Correct result only (1 pt) ────────────────────────────────────────────

  it('awards 1 point when the home win margin is wrong', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 3, awayScore: 1 }))
      .toEqual({ points: 1, breakdown: 'result' })
  })

  it('awards 1 point when the draw scoreline is wrong', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 2 }, { homeScore: 0, awayScore: 0 }))
      .toEqual({ points: 1, breakdown: 'result' })
  })

  it('awards 1 point when the away win margin is wrong', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 1 }, { homeScore: 1, awayScore: 3 }))
      .toEqual({ points: 1, breakdown: 'result' })
  })

  // ── Wrong result (0 pts) ──────────────────────────────────────────────────

  it('awards 0 points when predicting a home win but the result is a draw', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 1, awayScore: 1 }))
      .toEqual({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting a draw but the home team wins', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 1 }, { homeScore: 2, awayScore: 0 }))
      .toEqual({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting an away win but the home team wins', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 2 }, { homeScore: 1, awayScore: 0 }))
      .toEqual({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting a home win but the away team wins', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 0, awayScore: 2 }))
      .toEqual({ points: 0, breakdown: 'none' })
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('exact high-scoring match scores 3 points', () => {
    expect(calculatePoints({ predictedHome: 5, predictedAway: 4 }, { homeScore: 5, awayScore: 4 }))
      .toEqual({ points: 3, breakdown: 'exact' })
  })

  it('correct outcome on a high-scoring match scores 1 point', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 5, awayScore: 4 }))
      .toEqual({ points: 1, breakdown: 'result' })
  })
})
