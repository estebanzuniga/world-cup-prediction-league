import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import { prisma } from '../lib/prisma'
import { isPredictionLocked } from '../lib/lockout'

// ─── Unit tests: isPredictionLocked ──────────────────────────────────────────
// These test the pure boundary function in isolation — no HTTP, no DB,
// no fake timers needed because `now` is an explicit parameter.

describe('isPredictionLocked', () => {
  const KICKOFF = new Date('2030-06-15T18:00:00.000Z')

  it('is false 1 ms before kickoff', () => {
    expect(isPredictionLocked(KICKOFF, new Date(KICKOFF.getTime() - 1))).toBe(false)
  })

  it('is true at the exact kickoff millisecond (boundary is inclusive)', () => {
    expect(isPredictionLocked(KICKOFF, new Date(KICKOFF.getTime()))).toBe(true)
  })

  it('is true 1 ms after kickoff', () => {
    expect(isPredictionLocked(KICKOFF, new Date(KICKOFF.getTime() + 1))).toBe(true)
  })

  it('is false for a kickoff far in the future', () => {
    expect(isPredictionLocked(new Date('2099-01-01T00:00:00Z'))).toBe(false)
  })

  it('is true for a kickoff far in the past', () => {
    expect(isPredictionLocked(new Date('2000-01-01T00:00:00Z'))).toBe(true)
  })
})

// ─── Integration tests ───────────────────────────────────────────────────────

const TEST_USER = { name: 'Predictor', email: 'predictor@example.com', password: 'password123' }

const FUTURE_EXT_ID = 'test-pred-future'
const PAST_EXT_ID = 'test-pred-past'

let token: string
let userId: string
let futureMatchId: string
let pastMatchId: string

async function deleteUserWithLeagues(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return
  await prisma.league.deleteMany({ where: { createdBy: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
}

beforeAll(async () => {
  // Clean up any leftovers from a previous interrupted run
  await deleteUserWithLeagues(TEST_USER.email)
  await prisma.match.deleteMany({ where: { externalId: { in: [FUTURE_EXT_ID, PAST_EXT_ID] } } })

  await request(app).post('/api/auth/register').send(TEST_USER)
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password })
  token = loginRes.body.accessToken
  const user = await prisma.user.findUnique({ where: { email: TEST_USER.email } })
  userId = user!.id

  // A match whose kickoff is decades away — predictions open
  const future = await prisma.match.create({
    data: {
      homeTeam: 'Future FC',
      awayTeam: 'Open United',
      kickoffTime: new Date('2099-06-15T18:00:00Z'),
      externalId: FUTURE_EXT_ID,
      status: 'SCHEDULED',
    },
  })
  futureMatchId = future.id

  // A match that has already kicked off — predictions locked
  const past = await prisma.match.create({
    data: {
      homeTeam: 'Past City',
      awayTeam: 'Locked Rovers',
      kickoffTime: new Date('2020-06-15T18:00:00Z'),
      externalId: PAST_EXT_ID,
      status: 'FINISHED',
    },
  })
  pastMatchId = past.id
})

afterAll(async () => {
  await prisma.match.deleteMany({ where: { externalId: { in: [FUTURE_EXT_ID, PAST_EXT_ID] } } })
  await deleteUserWithLeagues(TEST_USER.email)
  await prisma.$disconnect()
})

// ─── POST /api/predictions ────────────────────────────────────────────────────

describe('POST /api/predictions', () => {
  it('creates a prediction for an upcoming match', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: futureMatchId, predictedHome: 2, predictedAway: 1 })

    expect(res.status).toBe(201)
    expect(res.body.prediction.matchId).toBe(futureMatchId)
    expect(res.body.prediction.predictedHome).toBe(2)
    expect(res.body.prediction.predictedAway).toBe(1)
    expect(res.body.prediction.userId).toBe(userId)
  })

  it('updates (upserts) an existing prediction before lockout', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: futureMatchId, predictedHome: 3, predictedAway: 0 })

    expect(res.status).toBe(201)
    expect(res.body.prediction.predictedHome).toBe(3)
    expect(res.body.prediction.predictedAway).toBe(0)

    // Confirm only one prediction row exists for this user+match
    const count = await prisma.prediction.count({
      where: { userId, matchId: futureMatchId },
    })
    expect(count).toBe(1)
  })

  it('returns 403 for a match whose kickoff has passed (lockout)', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: pastMatchId, predictedHome: 1, predictedAway: 0 })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/locked/i)
  })

  it('returns 403 even when a prediction already exists for a locked match', async () => {
    // Insert a row directly to simulate a prediction made before lockout
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId, matchId: pastMatchId } },
      create: { userId, matchId: pastMatchId, predictedHome: 0, predictedAway: 0 },
      update: {},
    })

    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: pastMatchId, predictedHome: 2, predictedAway: 2 })

    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent matchId', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: 'no-such-match', predictedHome: 1, predictedAway: 0 })

    expect(res.status).toBe(404)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: futureMatchId })

    expect(res.status).toBe(400)
  })

  it('returns 400 for negative score values', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Authorization', `Bearer ${token}`)
      .send({ matchId: futureMatchId, predictedHome: -1, predictedAway: 0 })

    expect(res.status).toBe(400)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .send({ matchId: futureMatchId, predictedHome: 1, predictedAway: 0 })

    expect(res.status).toBe(401)
  })
})

// ─── GET /api/predictions ─────────────────────────────────────────────────────

describe('GET /api/predictions', () => {
  it("returns the caller's own prediction for a match", async () => {
    // Ensure a prediction exists for the future match (left from POST tests above)
    const res = await request(app)
      .get(`/api/predictions?matchId=${futureMatchId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.prediction.matchId).toBe(futureMatchId)
    expect(res.body.prediction.userId).toBe(userId)
  })

  it('returns 404 when the user has no prediction for that match', async () => {
    // Create a fresh match with no predictions
    const fresh = await prisma.match.create({
      data: {
        homeTeam: 'Fresh A',
        awayTeam: 'Fresh B',
        kickoffTime: new Date('2099-07-01T18:00:00Z'),
        externalId: 'test-pred-fresh',
        status: 'SCHEDULED',
      },
    })

    const res = await request(app)
      .get(`/api/predictions?matchId=${fresh.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)

    await prisma.match.delete({ where: { id: fresh.id } })
  })

  it('returns 400 when matchId query param is missing', async () => {
    const res = await request(app)
      .get('/api/predictions')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app)
      .get(`/api/predictions?matchId=${futureMatchId}`)

    expect(res.status).toBe(401)
  })
})
