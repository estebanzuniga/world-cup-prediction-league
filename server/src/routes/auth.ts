import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../lib/jwt'

const BCRYPT_ROUNDS = 12

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const router = Router()

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body ?? {}

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Name is required.' })
      return
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Enter a valid email address.' })
      return
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await prisma.user.create({
      data: { name: name.trim(), email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {}

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    const validPassword =
      user !== null && (await bcrypt.compare(password, user.passwordHash))

    // Constant-time rejection: don't reveal whether email exists
    if (!user || !validPassword) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const payload: TokenPayload = { sub: user.id, email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS)
    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
})

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token: string | undefined = req.cookies?.refreshToken
    if (!token) {
      res.status(401).json({ error: 'No refresh token' })
      return
    }

    let payload: TokenPayload
    try {
      payload = verifyRefreshToken(token)
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' })
      return
    }

    const accessToken = signAccessToken({ sub: payload.sub, email: payload.email })
    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken', COOKIE_OPTS)
  res.status(204).send()
})

export default router
