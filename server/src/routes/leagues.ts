import { Router, Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { calculatePoints } from '../services/scoring'
import { toSpanish } from '../utils/countryNames'

const router = Router()
router.use(requireAuth)

const MEMBER_SELECT = {
  include: {
    members: {
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' as const },
    },
  },
}

function generateToken(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function backfillPoints(userId: string, leagueId: string): Promise<void> {
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      match: { status: 'FINISHED', homeScore: { not: null }, awayScore: { not: null } },
    },
    include: { match: true },
  })
  for (const prediction of predictions) {
    const scored = calculatePoints(
      { predictedHome: prediction.predictedHome, predictedAway: prediction.predictedAway, predictedAdvancing: prediction.predictedAdvancing },
      { homeScore: prediction.match.homeScore!, awayScore: prediction.match.awayScore! },
      { stage: prediction.match.stage, advancingTeam: prediction.match.advancingTeam },
    )
    await prisma.pointsLedger.upsert({
      where: { userId_matchId_leagueId: { userId, matchId: prediction.matchId, leagueId } },
      create: { userId, matchId: prediction.matchId, leagueId, points: scored.points, breakdown: { result: scored.breakdown } },
      update: { points: scored.points, breakdown: { result: scored.breakdown } },
    })
  }
}

// GET /api/leagues
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagues = await prisma.league.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      select: { id: true, name: true, createdAt: true, createdBy: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ leagues })
  } catch (err) {
    next(err)
  }
})

// POST /api/leagues
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body ?? {}
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' })
      return
    }
    const league = await prisma.league.create({
      data: {
        name: name.trim(),
        createdBy: req.user!.id,
        members: { create: { userId: req.user!.id } },
      },
      ...MEMBER_SELECT,
    })
    await backfillPoints(req.user!.id, league.id)
    res.status(201).json({ league })
  } catch (err) {
    next(err)
  }
})

// POST /api/leagues/join
router.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body ?? {}
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'token is required' })
      return
    }

    const inviteToken = await prisma.inviteToken.findUnique({ where: { token } })
    if (!inviteToken) {
      res.status(404).json({ error: 'Código de invitación inválido' })
      return
    }
    if (inviteToken.usedAt) {
      res.status(410).json({ error: 'Este enlace ya fue utilizado' })
      return
    }
    if (inviteToken.expiresAt < new Date()) {
      res.status(410).json({ error: 'Este enlace de invitación ha expirado' })
      return
    }

    const alreadyMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: inviteToken.leagueId, userId: req.user!.id } },
    })
    if (alreadyMember) {
      res.status(409).json({ error: 'Ya eres miembro de esta liga' })
      return
    }

    await prisma.$transaction([
      prisma.leagueMember.create({ data: { leagueId: inviteToken.leagueId, userId: req.user!.id } }),
      prisma.inviteToken.update({ where: { token }, data: { usedAt: new Date(), usedBy: req.user!.id } }),
    ])

    await backfillPoints(req.user!.id, inviteToken.leagueId)

    const league = await prisma.league.findUnique({ where: { id: inviteToken.leagueId }, ...MEMBER_SELECT })
    res.json({ league })
  } catch (err) {
    next(err)
  }
})

// POST /api/leagues/:id/invite-tokens — generate a new invite token (creator only)
router.post('/:id/invite-tokens', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) { res.status(404).json({ error: 'Liga no encontrada' }); return }
    if (league.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Solo el creador de la liga puede generar enlaces de invitación' })
      return
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const inviteToken = await prisma.inviteToken.create({
      data: { token: generateToken(), leagueId: league.id, createdBy: req.user!.id, expiresAt },
    })
    res.status(201).json({ token: inviteToken.token, expiresAt: inviteToken.expiresAt, usedAt: null })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/invite-tokens — list recent tokens (creator only)
router.get('/:id/invite-tokens', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id } })
    if (!league) { res.status(404).json({ error: 'Liga no encontrada' }); return }
    if (league.createdBy !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return }
    const tokens = await prisma.inviteToken.findMany({
      where: { leagueId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { token: true, expiresAt: true, usedAt: true },
    })
    res.json({ tokens })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/leaderboard
router.get('/:id/leaderboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.params.id
    const [league, ledgerRows] = await Promise.all([
      prisma.league.findUnique({
        where: { id: leagueId },
        include: {
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } } },
            orderBy: { joinedAt: 'asc' as const },
          },
        },
      }),
      prisma.pointsLedger.findMany({ where: { leagueId }, select: { userId: true, points: true, breakdown: true } }),
    ])
    if (!league) { res.status(404).json({ error: 'League not found' }); return }
    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

    const stats = new Map<string, { totalPoints: number; predictionsCount: number; exactScoreCount: number }>()
    for (const row of ledgerRows) {
      const s = stats.get(row.userId) ?? { totalPoints: 0, predictionsCount: 0, exactScoreCount: 0 }
      s.totalPoints += row.points
      s.predictionsCount++
      if ((row.breakdown as Record<string, unknown>)?.result === 'exact') s.exactScoreCount++
      stats.set(row.userId, s)
    }
    const sorted = league.members
      .map((m) => {
        const s = stats.get(m.userId) ?? { totalPoints: 0, predictionsCount: 0, exactScoreCount: 0 }
        return { userId: m.userId, name: m.user.name, avatarUrl: m.user.avatarUrl, avatarColor: m.user.avatarColor, ...s }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name))

    let position = 1
    const leaderboard = sorted.map((entry, i) => {
      if (i > 0 && entry.totalPoints < sorted[i - 1].totalPoints) position = i + 1
      return { ...entry, position }
    })
    res.json({ leaderboard })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/predictions
router.get('/:id/predictions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.params.id
    const league = await prisma.league.findUnique({ where: { id: leagueId }, include: { members: { select: { userId: true } } } })
    if (!league) { res.status(404).json({ error: 'League not found' }); return }
    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

    const memberIds = league.members.map((m) => m.userId)
    const now = new Date()
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { status: { in: ['FINISHED', 'LIVE'] } },
          { kickoffTime: { lt: now } },
        ],
      },
      orderBy: { kickoffTime: 'desc' },
      select: { id: true, homeTeam: true, awayTeam: true, homeTeamCrestUrl: true, awayTeamCrestUrl: true, kickoffTime: true, homeScore: true, awayScore: true, status: true, stage: true, advancingTeam: true },
    })
    const predictions = await prisma.prediction.findMany({
      where: { matchId: { in: matches.map((m) => m.id) }, userId: { in: memberIds } },
      select: { matchId: true, userId: true, predictedHome: true, predictedAway: true, predictedAdvancing: true },
    })
    const byMatch = new Map<string, typeof predictions>()
    for (const p of predictions) {
      const list = byMatch.get(p.matchId) ?? []
      list.push(p)
      byMatch.set(p.matchId, list)
    }
    const result = matches.map((match) => ({
      ...match,
      predictions: (byMatch.get(match.id) ?? []).map((p) => {
        if (match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
          const scored = calculatePoints(
            { predictedHome: p.predictedHome, predictedAway: p.predictedAway, predictedAdvancing: p.predictedAdvancing },
            { homeScore: match.homeScore, awayScore: match.awayScore },
            { stage: match.stage, advancingTeam: match.advancingTeam }
          )
          return { userId: p.userId, predictedHome: p.predictedHome, predictedAway: p.predictedAway, points: scored.points, breakdown: scored.breakdown }
        }
        return { userId: p.userId, predictedHome: p.predictedHome, predictedAway: p.predictedAway, points: null, breakdown: null }
      }),
    }))
    res.json({ matches: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/history
router.get('/:id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.params.id
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } } },
          orderBy: { joinedAt: 'asc' as const },
        },
      },
    })
    if (!league) { res.status(404).json({ error: 'League not found' }); return }
    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }

    const ledgerRows = await prisma.pointsLedger.findMany({
      where: { leagueId },
      include: { match: { select: { homeTeam: true, awayTeam: true, kickoffTime: true } } },
      orderBy: { match: { kickoffTime: 'asc' } },
    })

    const members = league.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      avatarColor: m.user.avatarColor,
    }))
    const memberIds = members.map((m) => m.userId)

    // Group rows by match, preserving kickoffTime order
    const matchMap = new Map<string, {
      matchId: string
      label: string
      kickoffTime: string
      points: Record<string, number>
    }>()
    for (const row of ledgerRows) {
      if (!matchMap.has(row.matchId)) {
        matchMap.set(row.matchId, {
          matchId: row.matchId,
          label: `${toSpanish(row.match.homeTeam)} vs ${toSpanish(row.match.awayTeam)}`,
          kickoffTime: row.match.kickoffTime.toISOString(),
          points: {},
        })
      }
      matchMap.get(row.matchId)!.points[row.userId] = row.points
    }

    // Compute cumulative totals per member
    const running: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]))
    const history = Array.from(matchMap.values()).map((match) => {
      for (const userId of memberIds) {
        running[userId] += match.points[userId] ?? 0
      }
      return {
        matchId: match.matchId,
        label: match.label,
        kickoffTime: match.kickoffTime,
        cumulative: { ...running },
      }
    })

    res.json({ members, history })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const league = await prisma.league.findUnique({ where: { id: req.params.id }, ...MEMBER_SELECT })
    if (!league) { res.status(404).json({ error: 'League not found' }); return }
    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) { res.status(403).json({ error: 'Forbidden' }); return }
    res.json({ league })
  } catch (err) {
    next(err)
  }
})

export default router
