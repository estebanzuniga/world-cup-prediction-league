import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import { prisma } from '../lib/prisma'

// ── Test users ────────────────────────────────────────────────────────────────

const USER_A = { name: 'League Owner',  email: 'league-a@example.com', password: 'password123' }
const USER_B = { name: 'League Joiner', email: 'league-b@example.com', password: 'password123' }
const USER_C = { name: 'Outsider',      email: 'league-c@example.com', password: 'password123' }

let tokenA: string
let tokenB: string
let tokenC: string
let userAId: string

async function deleteUserWithLeagues(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) return
  // League.createdBy has no cascade from User — must delete leagues first
  await prisma.league.deleteMany({ where: { createdBy: user.id } })
  await prisma.user.delete({ where: { id: user.id } })
}

async function setupUser(u: typeof USER_A): Promise<string> {
  await deleteUserWithLeagues(u.email)
  await request(app).post('/api/auth/register').send(u)
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: u.email, password: u.password })
  return res.body.accessToken as string
}

beforeAll(async () => {
  tokenA = await setupUser(USER_A)
  tokenB = await setupUser(USER_B)
  tokenC = await setupUser(USER_C)
  const userA = await prisma.user.findUnique({ where: { email: USER_A.email } })
  userAId = userA!.id
})

afterAll(async () => {
  for (const u of [USER_A, USER_B, USER_C]) {
    await deleteUserWithLeagues(u.email)
  }
  await prisma.$disconnect()
})

// ── POST /api/leagues ─────────────────────────────────────────────────────────

describe('POST /api/leagues', () => {
  it('creates a league and auto-adds the creator as a member', async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'My League' })

    expect(res.status).toBe(201)
    expect(res.body.league.name).toBe('My League')
    expect(res.body.league.inviteCode).toMatch(/^[0-9A-F]{8}$/)
    expect(res.body.league.members).toHaveLength(1)
    expect(res.body.league.members[0].userId).toBe(userAId)
    expect(res.body.league.members[0].user.passwordHash).toBeUndefined()
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/leagues').send({ name: 'Ghost League' })
    expect(res.status).toBe(401)
  })
})

// ── POST /api/leagues/join ────────────────────────────────────────────────────

describe('POST /api/leagues/join', () => {
  let leagueId: string
  let inviteCode: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Join-Test League' })
    leagueId = res.body.league.id
    inviteCode = res.body.league.inviteCode
  })

  it('joins the league and returns updated member list', async () => {
    const res = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ inviteCode })

    expect(res.status).toBe(200)
    expect(res.body.league.id).toBe(leagueId)
    expect(res.body.league.members).toHaveLength(2)
    const emails = res.body.league.members.map((m: any) => m.user.email)
    expect(emails).toContain(USER_A.email)
    expect(emails).toContain(USER_B.email)
  })

  it('returns 409 when already a member', async () => {
    const res = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ inviteCode })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already a member/i)
  })

  it('returns 404 for an invalid invite code', async () => {
    const res = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({ inviteCode: 'DEADBEEF' })

    expect(res.status).toBe(404)
  })

  it('returns 400 when inviteCode is missing', async () => {
    const res = await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${tokenC}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/leagues/join').send({ inviteCode })
    expect(res.status).toBe(401)
  })
})

// ── GET /api/leagues/:id ──────────────────────────────────────────────────────

describe('GET /api/leagues/:id', () => {
  let leagueId: string
  let inviteCode: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/leagues')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Get-Test League' })
    leagueId = res.body.league.id
    inviteCode = res.body.league.inviteCode

    // Add user B as member
    await request(app)
      .post('/api/leagues/join')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ inviteCode })
  })

  it('returns league details and members for a member', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(200)
    expect(res.body.league.name).toBe('Get-Test League')
    expect(res.body.league.inviteCode).toBe(inviteCode)
    expect(res.body.league.members).toHaveLength(2)
    // Members ordered by joinedAt — creator first
    expect(res.body.league.members[0].user.email).toBe(USER_A.email)
    // Sensitive fields must not leak
    res.body.league.members.forEach((m: any) => {
      expect(m.user.passwordHash).toBeUndefined()
    })
  })

  it('returns 403 for a non-member (user C)', async () => {
    const res = await request(app)
      .get(`/api/leagues/${leagueId}`)
      .set('Authorization', `Bearer ${tokenC}`)

    expect(res.status).toBe(403)
  })

  it('returns 404 for a non-existent league id', async () => {
    const res = await request(app)
      .get('/api/leagues/does-not-exist')
      .set('Authorization', `Bearer ${tokenA}`)

    expect(res.status).toBe(404)
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/leagues/${leagueId}`)
    expect(res.status).toBe(401)
  })
})
