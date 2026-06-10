import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import { prisma } from '../lib/prisma'

// ── Shared fixtures ───────────────────────────────────────────────────────────

const USER_A = { name: 'Alice', email: 'lb-a@example.com', password: 'password123' }
const USER_B = { name: 'Bob',   email: 'lb-b@example.com', password: 'password123' }
const USER_C = { name: 'Carol', email: 'lb-c@example.com', password: 'password123' }

let tokenA: string
let tokenB: string
let tokenC: string
let userAId: string
let userBId: string
let leagueId: string

// Two finished matches used by both test suites
const MATCH_EXT_1 = 'lb-test-match-1'
const MATCH_EXT_2 = 'lb-test-match-2'
// One upcoming match (not finished) used by matches tests
const MATCH_EXT_3 = 'lb-test-match-3'
let matchId1: string
let matchId2: string
let matchId3: string

async function deleteUserWithLeagues(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return
  await prisma.league.deleteMany({ where: { createdBy: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
}

async function setupUser(u: typeof USER_A): Promise<{ token: string; id: string }> {
  await deleteUserWithLeagues(u.email)
  await request(app).post('/api/auth/register').send(u)
  const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u.password })
  const user = await prisma.user.findUnique({ where: { email: u.email } })
  return { token: res.body.accessToken as string, id: user!.id }
}

beforeAll(async () => {
  ({ token: tokenA, id: userAId } = await setupUser(USER_A));
  ({ token: tokenB, id: userBId } = await setupUser(USER_B));
  ({ token: tokenC, id: userCId } = await setupUser(USER_C));

  // Clean up any test matches from a previous interrupted run
  await prisma.match.deleteMany({ where: { externalId: { in: [MATCH_EXT_1, MATCH_EXT_2, MATCH_EXT_3] } } })

  // A creates a league; B joins; C stays out
  const leagueRes = await request(app)
    .post('/api/leagues')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Leaderboard Test League' })
  leagueId = leagueRes.body.league.id

  await request(app)
    .post('/api/leagues/join')
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ inviteCode: leagueRes.body.league.inviteCode })

  // Create test matches
  const m1 = await prisma.match.create({
    data: { homeTeam: 'Home FC', awayTeam: 'Away United', kickoffTime: new Date('2020-06-01T18:00:00Z'), externalId: MATCH_EXT_1, status: 'FINISHED', homeScore: 2, awayScore: 1 },
  })
  const m2 = await prisma.match.create({
    data: { homeTeam: 'Alpha SC', awayTeam: 'Beta CF', kickoffTime: new Date('2020-06-02T18:00:00Z'), externalId: MATCH_EXT_2, status: 'FINISHED', homeScore: 0, awayScore: 0 },
  })
  const m3 = await prisma.match.create({
    data: { homeTeam: 'Future A', awayTeam: 'Future B', kickoffTime: new Date('2099-06-01T18:00:00Z'), externalId: MATCH_EXT_3, status: 'SCHEDULED' },
  })
  matchId1 = m1.id
  matchId2 = m2.id
  matchId3 = m3.id

  // A: exact on match1 (3pts), correct result on match2 (1pt) → 4 pts
  await prisma.pointsLedger.createMany({
    data: [
      { userId: userAId, matchId: matchId1, leagueId, points: 3, breakdown: { result: 'exact' } },
      { userId: userAId, matchId: matchId2, leagueId, points: 1, breakdown: { result: 'result' } },
    ],
  })

  // B: wrong result on match1 (0pts), exact on match2 (3pts) → 3 pts
  await prisma.pointsLedger.createMany({
    data: [
      { userId: userBId, matchId: matchId1, leagueId, points: 0, breakdown: { result: 'none' } },
      { userId: userBId, matchId: matchId2, leagueId, points: 3, breakdown: { result: 'exact' } },
    ],
  })

  // A's predictions (used by GET /api/matches tests)
  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: userAId, matchId: matchId1 } },
    create: { userId: userAId, matchId: matchId1, predictedHome: 2, predictedAway: 1 },
    update: {},
  })
  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: userAId, matchId: matchId2 } },
    create: { userId: userAId, matchId: matchId2, predictedHome: 1, predictedAway: 1 },
    update: {},
  })
  await prisma.prediction.upsert({
    where: { userId_matchId: { userId: userAId, matchId: matchId3 } },
    create: { userId: userAId, matchId: matchId3, predictedHome: 2, predictedAway: 0 },
    update: {},
  })
})

// userCId is set in beforeAll; declare it at module scope so TypeScript is happy
let userCId: string;
// eslint-disable-next-line prefer-const
({ token: tokenC, id: userCId } = { token: '', id: '' }) // placeholder — overwritten in beforeAll

afterAll(async () => {
  await prisma.match.deleteMany({ where: { externalId: { in: [MATCH_EXT_1, MATCH_EXT_2, MATCH_EXT_3] } } })
  for (const u of [USER_A, USER_B, USER_C]) await deleteUserWithLeagues(u.email)
  await prisma.$disconnect()
})

// ── GET /api/leagues/:id/leaderboard ─────────────────────────────────────────

describe('GET /api/leagues/:id/leaderboard', () => {
  it('returns members sorted by totalPoints descending', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/leaderboard`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    const { leaderboard } = res.body
    expect(leaderboard).toHaveLength(2)

    // A has 4 pts, B has 3 pts — A must be first
    expect(leaderboard[0].userId).toBe(userAId)
    expect(leaderboard[0].totalPoints).toBe(4)
    expect(leaderboard[0].predictionsCount).toBe(2)
    expect(leaderboard[0].exactScoreCount).toBe(1)

    expect(leaderboard[1].userId).toBe(userBId)
    expect(leaderboard[1].totalPoints).toBe(3)
    expect(leaderboard[1].predictionsCount).toBe(2)
    expect(leaderboard[1].exactScoreCount).toBe(1)
  })

  it('includes name and avatarUrl on each entry', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/leaderboard`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    for (const entry of res.body.leaderboard) {
      expect(typeof entry.name).toBe('string')
      expect('avatarUrl' in entry).toBe(true)
      expect(entry.passwordHash).toBeUndefined()
    }
  })

  it('returns zeroed stats for members with no finished predictions yet', async () => {
    // Create a third member who has no ledger rows
    const USER_D = { name: 'Dave', email: 'lb-d@example.com', password: 'password123' }
    await deleteUserWithLeagues(USER_D.email)
    await request(app).post('/api/auth/register').send(USER_D)
    const loginRes = await request(app).post('/api/auth/login').send({ email: USER_D.email, password: USER_D.password })
    const tokenD = loginRes.body.accessToken as string

    const joinRes = await request(app)
      .get(`/api/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${tokenA}`)
    const inviteCode = joinRes.body.league.inviteCode
    await request(app).post('/api/leagues/join').set('Authorization', `Bearer ${tokenD}`).send({ inviteCode })

    const res = await request(app)
      .get(`/api/leagues/${leagueId}/leaderboard`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    const dave = res.body.leaderboard.find((e: { name: string }) => e.name === 'Dave')
    expect(dave).toBeDefined()
    expect(dave.totalPoints).toBe(0)
    expect(dave.predictionsCount).toBe(0)
    expect(dave.exactScoreCount).toBe(0)

    await deleteUserWithLeagues(USER_D.email)
  })

  it('returns 403 for a non-member', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/leaderboard`)
      .set('Authorization', `Bearer ${tokenC}`)
    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent league', async () => {
    const res = await request(app)
      .get('/api/leagues/does-not-exist/leaderboard')
      .set('Authorization', `Bearer ${tokenA}`)
    expect(res.status).toBe(404)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/leagues/${leagueId}/leaderboard`)
    expect(res.status).toBe(401)
  })
})

// ── GET /api/matches ──────────────────────────────────────────────────────────

describe('GET /api/matches', () => {
  it('returns all matches ordered by kickoffTime', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    const { matches } = res.body
    expect(Array.isArray(matches)).toBe(true)

    // Verify ordering: each kickoffTime ≥ the previous
    for (let i = 1; i < matches.length; i++) {
      expect(new Date(matches[i].kickoffTime).getTime())
        .toBeGreaterThanOrEqual(new Date(matches[i - 1].kickoffTime).getTime())
    }
  })

  it('includes match fields on every entry', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tokenA}`)

    const match = res.body.matches.find((m: { id: string }) => m.id === matchId1)
    expect(match).toBeDefined()
    expect(match.homeTeam).toBe('Home FC')
    expect(match.awayTeam).toBe('Away United')
    expect(match.status).toBe('FINISHED')
    expect(match.homeScore).toBe(2)
    expect(match.awayScore).toBe(1)
  })

  it('attaches myPrediction with points for finished matches with a prediction', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tokenA}`)

    const match1 = res.body.matches.find((m: { id: string }) => m.id === matchId1)
    expect(match1.myPrediction).not.toBeNull()
    expect(match1.myPrediction.predictedHome).toBe(2)
    expect(match1.myPrediction.predictedAway).toBe(1)
    expect(match1.myPrediction.points).toBe(3)       // exact score
    expect(match1.myPrediction.breakdown).toBe('exact')

    const match2 = res.body.matches.find((m: { id: string }) => m.id === matchId2)
    expect(match2.myPrediction).not.toBeNull()
    expect(match2.myPrediction.points).toBe(1)       // 1-1 predicted, 0-0 actual → correct result
    expect(match2.myPrediction.breakdown).toBe('result')
  })

  it('sets myPrediction to null for a finished match with no prediction', async () => {
    // User B has no predictions seeded, so all myPrediction fields should be null
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tokenB}`)

    const match1 = res.body.matches.find((m: { id: string }) => m.id === matchId1)
    expect(match1.myPrediction).toBeNull()
  })

  it('includes myPrediction without points for a scheduled (not finished) match', async () => {
    const res = await request(app)
      .get('/api/matches')
      .set('Authorization', `Bearer ${tokenA}`)

    const match3 = res.body.matches.find((m: { id: string }) => m.id === matchId3)
    expect(match3).toBeDefined()
    expect(match3.myPrediction).not.toBeNull()
    expect(match3.myPrediction.predictedHome).toBe(2)
    expect(match3.myPrediction.predictedAway).toBe(0)
    expect(match3.myPrediction.points).toBeNull()
    expect(match3.myPrediction.breakdown).toBeNull()
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/matches')
    expect(res.status).toBe(401)
  })
})

// ── GET /api/leagues/:id/predictions ─────────────────────────────────────────

describe('GET /api/leagues/:id/predictions', () => {
  it("returns members' predictions with points for finished matches", async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/predictions`)
      .set('Authorization', `Bearer ${tokenB}`)

    expect(res.status).toBe(200)

    const m1 = res.body.matches.find((m: { id: string }) => m.id === matchId1)
    expect(m1).toBeDefined()
    expect(m1.homeScore).toBe(2)
    expect(m1.awayScore).toBe(1)

    // B can see A's prediction because the match is finished
    const aPred = m1.predictions.find((p: { userId: string }) => p.userId === userAId)
    expect(aPred).toBeDefined()
    expect(aPred.predictedHome).toBe(2)
    expect(aPred.predictedAway).toBe(1)
    expect(aPred.points).toBe(3)
    expect(aPred.breakdown).toBe('exact')
  })

  it('never includes non-finished matches', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/predictions`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    const m3 = res.body.matches.find((m: { id: string }) => m.id === matchId3)
    expect(m3).toBeUndefined()
  })

  it('returns 403 for a non-member', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}/predictions`)
      .set('Authorization', `Bearer ${tokenC}`)

    expect(res.status).toBe(403)
  })

  it('returns 404 for an unknown league', async () => {
    const res = await request(app)
      .get('/api/leagues/nonexistent-league-id/predictions')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(404)
  })
})
