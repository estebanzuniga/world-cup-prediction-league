import { describe, it, expect } from 'vitest'
import { calculatePoints } from '../services/scoring'

describe('calculatePoints — group stage (3/1/0)', () => {
  it('awards 3 points for an exact home win', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 3, awayScore: 1 }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact draw', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 1 }, { homeScore: 1, awayScore: 1 }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact away win', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 2 }, { homeScore: 0, awayScore: 2 }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('awards 3 points for an exact 0-0 draw', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 0 }, { homeScore: 0, awayScore: 0 }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('awards 1 point when the home win margin is wrong', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 3, awayScore: 1 }))
      .toMatchObject({ points: 1, breakdown: 'result' })
  })

  it('awards 1 point when the draw scoreline is wrong', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 2 }, { homeScore: 0, awayScore: 0 }))
      .toMatchObject({ points: 1, breakdown: 'result' })
  })

  it('awards 1 point when the away win margin is wrong', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 1 }, { homeScore: 1, awayScore: 3 }))
      .toMatchObject({ points: 1, breakdown: 'result' })
  })

  it('awards 0 points when predicting a home win but the result is a draw', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 1, awayScore: 1 }))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting a draw but the home team wins', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 1 }, { homeScore: 2, awayScore: 0 }))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting an away win but the home team wins', () => {
    expect(calculatePoints({ predictedHome: 0, predictedAway: 2 }, { homeScore: 1, awayScore: 0 }))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('awards 0 points when predicting a home win but the away team wins', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 0, awayScore: 2 }))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('exact high-scoring match scores 3 points', () => {
    expect(calculatePoints({ predictedHome: 5, predictedAway: 4 }, { homeScore: 5, awayScore: 4 }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('correct outcome on a high-scoring match scores 1 point', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 5, awayScore: 4 }))
      .toMatchObject({ points: 1, breakdown: 'result' })
  })
})

// Helper
const KO = (stage: string, advancingTeam?: 'HOME' | 'AWAY' | null) =>
  ({ stage, advancingTeam: advancingTeam ?? null })

describe('calculatePoints — knockout: exact tier', () => {
  it('LAST_32: decisive exact score → 5 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 2, awayScore: 1 }, KO('LAST_32')))
      .toMatchObject({ points: 5, breakdown: 'exact' })
  })

  it('LAST_16: decisive exact score → 6 pts', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 0 }, { homeScore: 3, awayScore: 0 }, KO('LAST_16')))
      .toMatchObject({ points: 6, breakdown: 'exact' })
  })

  it('QUARTER_FINALS: decisive exact score → 7 pts', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('QUARTER_FINALS')))
      .toMatchObject({ points: 7, breakdown: 'exact' })
  })

  it('SEMI_FINALS: decisive exact score → 8 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 2, awayScore: 0 }, KO('SEMI_FINALS')))
      .toMatchObject({ points: 8, breakdown: 'exact' })
  })

  it('THIRD_PLACE: decisive exact score → 8 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 2, awayScore: 1 }, KO('THIRD_PLACE')))
      .toMatchObject({ points: 8, breakdown: 'exact' })
  })

  it('FINAL: decisive exact score → 10 pts', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('FINAL')))
      .toMatchObject({ points: 10, breakdown: 'exact' })
  })

  it('LAST_32: draw exact score + correct advancing team → 5 pts', () => {
    expect(calculatePoints(
      { predictedHome: 1, predictedAway: 1, predictedAdvancing: 'HOME' },
      { homeScore: 1, awayScore: 1 },
      KO('LAST_32', 'HOME')
    )).toMatchObject({ points: 5, breakdown: 'exact' })
  })

  it('FINAL: draw exact score + correct advancing team → 10 pts', () => {
    expect(calculatePoints(
      { predictedHome: 0, predictedAway: 0, predictedAdvancing: 'AWAY' },
      { homeScore: 0, awayScore: 0 },
      KO('FINAL', 'AWAY')
    )).toMatchObject({ points: 10, breakdown: 'exact' })
  })

  it('draw: correct score + wrong advancing team → adv_diff (case 2)', () => {
    expect(calculatePoints(
      { predictedHome: 1, predictedAway: 1, predictedAdvancing: 'AWAY' },
      { homeScore: 1, awayScore: 1 },
      KO('LAST_32', 'HOME')
    )).toMatchObject({ points: 3, breakdown: 'adv_diff' })
  })

  it('draw: wrong score + wrong advancing team → none (case 4)', () => {
    expect(calculatePoints(
      { predictedHome: 0, predictedAway: 0, predictedAdvancing: 'AWAY' },
      { homeScore: 1, awayScore: 1 },
      KO('LAST_32', 'HOME')
    )).toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('FINAL draw: correct score + wrong advancing team → adv_diff', () => {
    expect(calculatePoints(
      { predictedHome: 2, predictedAway: 2, predictedAdvancing: 'HOME' },
      { homeScore: 2, awayScore: 2 },
      KO('FINAL', 'AWAY')
    )).toMatchObject({ points: 7, breakdown: 'adv_diff' })
  })
})

describe('calculatePoints — knockout: adv_diff tier', () => {
  it('LAST_32: right winner + right margin, wrong score → 3 pts', () => {
    // predicted 3-1 (margin 2), actual 2-0 (margin 2), both home wins
    expect(calculatePoints({ predictedHome: 3, predictedAway: 1 }, { homeScore: 2, awayScore: 0 }, KO('LAST_32')))
      .toMatchObject({ points: 3, breakdown: 'adv_diff' })
  })

  it('FINAL: right winner + right margin, wrong score → 7 pts', () => {
    // predicted 2-0 (margin 2), actual 3-1 (margin 2)
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 3, awayScore: 1 }, KO('FINAL')))
      .toMatchObject({ points: 7, breakdown: 'adv_diff' })
  })

  it('LAST_32: draw + right advancing team + different draw score → adv_diff (margins both 0)', () => {
    expect(calculatePoints(
      { predictedHome: 0, predictedAway: 0, predictedAdvancing: 'HOME' },
      { homeScore: 1, awayScore: 1 },
      KO('LAST_32', 'HOME')
    )).toMatchObject({ points: 3, breakdown: 'adv_diff' })
  })

  it('QUARTER_FINALS: right winner + right margin → 5 pts', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 2, awayScore: 1 }, KO('QUARTER_FINALS')))
      .toMatchObject({ points: 5, breakdown: 'adv_diff' })
  })
})

describe('calculatePoints — knockout: adv_only tier', () => {
  it('LAST_32: right winner, wrong margin → 2 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('LAST_32')))
      .toMatchObject({ points: 2, breakdown: 'adv_only' })
  })

  it('LAST_16: right winner, wrong margin → 3 pts', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('LAST_16')))
      .toMatchObject({ points: 3, breakdown: 'adv_only' })
  })

  it('FINAL: right winner, wrong margin → 5 pts', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('FINAL')))
      .toMatchObject({ points: 5, breakdown: 'adv_only' })
  })

  it('SEMI_FINALS: right winner, wrong margin → 4 pts', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 0 }, { homeScore: 1, awayScore: 0 }, KO('SEMI_FINALS')))
      .toMatchObject({ points: 4, breakdown: 'adv_only' })
  })
})

describe('calculatePoints — knockout: one_team tier', () => {
  it('LAST_32: wrong advancing team but one score correct → 1 pt', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 0, awayScore: 1 }, KO('LAST_32')))
      .toMatchObject({ points: 1, breakdown: 'one_team' })
  })

  it('QUARTER_FINALS: wrong advancing team, home score matches → 2 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 0, awayScore: 1 }, KO('QUARTER_FINALS')))
      .toMatchObject({ points: 2, breakdown: 'one_team' })
  })

  it('FINAL: wrong advancing team, one score matches → 3 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 0, awayScore: 1 }, KO('FINAL')))
      .toMatchObject({ points: 3, breakdown: 'one_team' })
  })
})

describe('calculatePoints — knockout: none tier', () => {
  it('LAST_32: wrong advancing team, no scores match → 0 pts', () => {
    expect(calculatePoints({ predictedHome: 3, predictedAway: 0 }, { homeScore: 0, awayScore: 2 }, KO('LAST_32')))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })

  it('FINAL: wrong advancing team, no scores match → 0 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 0 }, { homeScore: 0, awayScore: 3 }, KO('FINAL')))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })
})

describe('calculatePoints — knockout: GROUP_STAGE stage falls back to 3/1/0', () => {
  it('GROUP_STAGE exact → 3 pts', () => {
    expect(calculatePoints({ predictedHome: 2, predictedAway: 1 }, { homeScore: 2, awayScore: 1 }, { stage: 'GROUP_STAGE' }))
      .toMatchObject({ points: 3, breakdown: 'exact' })
  })

  it('GROUP_STAGE correct result → 1 pt', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 3, awayScore: 1 }, { stage: 'GROUP_STAGE' }))
      .toMatchObject({ points: 1, breakdown: 'result' })
  })

  it('GROUP_STAGE wrong result → 0 pts', () => {
    expect(calculatePoints({ predictedHome: 1, predictedAway: 0 }, { homeScore: 0, awayScore: 1 }, { stage: 'GROUP_STAGE' }))
      .toMatchObject({ points: 0, breakdown: 'none' })
  })
})
