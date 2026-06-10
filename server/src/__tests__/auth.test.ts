import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app'
import { prisma } from '../lib/prisma'

const TEST_EMAIL = 'auth-test@example.com'

const credentials = {
  name: 'Auth Tester',
  email: TEST_EMAIL,
  password: 'hunter2-but-longer',
}

async function registerUser() {
  return request(app).post('/api/auth/register').send(credentials)
}

async function loginUser() {
  return request(app)
    .post('/api/auth/login')
    .send({ email: credentials.email, password: credentials.password })
}

// Wipe the test user before each test for isolation
beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } })
  await prisma.$disconnect()
})

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('creates a user and returns 201 with public fields only', async () => {
    const res = await registerUser()

    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe(TEST_EMAIL)
    expect(res.body.user.name).toBe(credentials.name)
    expect(res.body.user.id).toBeTruthy()
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('returns 409 when email is already registered', async () => {
    await registerUser()
    const res = await registerUser()

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already registered/i)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL }) // no name or password

    expect(res.status).toBe(400)
  })
})

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser()
  })

  it('returns an access token and sets an httpOnly refresh cookie', async () => {
    const res = await loginUser()

    expect(res.status).toBe(200)
    expect(typeof res.body.accessToken).toBe('string')
    expect(res.body.accessToken.length).toBeGreaterThan(20)

    const raw = res.headers['set-cookie']
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : []
    const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='))
    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toContain('HttpOnly')
  })

  it('returns 401 for a wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'totally-wrong' })

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/invalid credentials/i)
  })

  it('returns 401 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'anything' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL })

    expect(res.status).toBe(400)
  })
})

// ─── Refresh ─────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('issues a new access token from the refresh cookie', async () => {
    await registerUser()

    // Use an agent so the cookie jar persists across requests
    const agent = request.agent(app)
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })

    expect(loginRes.status).toBe(200)
    const firstToken = loginRes.body.accessToken

    const refreshRes = await agent.post('/api/auth/refresh')

    expect(refreshRes.status).toBe(200)
    // Must be a well-formed JWT (three base64url segments)
    expect(refreshRes.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/)
  })

  it('returns 401 when no cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh')

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/no refresh token/i)
  })

  it('returns 401 for a tampered cookie value', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=this.is.not.a.valid.jwt')

    expect(res.status).toBe(401)
  })
})
