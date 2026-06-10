import { Router, Request, Response, NextFunction } from 'express'
import { randomBytes } from 'crypto'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { calculatePoints } from '../services/scoring'

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

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

// Backfill PointsLedger for all finished matches where `userId` has a prediction.
// Called when a user joins or creates a league so past results are reflected immediately
// without waiting for the next syncResults run.
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
      { predictedHome: prediction.predictedHome, predictedAway: prediction.predictedAway },
      { homeScore: prediction.match.homeScore!, awayScore: prediction.match.awayScore! },
    )
    await prisma.pointsLedger.upsert({
      where: { userId_matchId_leagueId: { userId, matchId: prediction.matchId, leagueId } },
      create: { userId, matchId: prediction.matchId, leagueId, points: scored.points, breakdown: { result: scored.breakdown } },
      update: { points: scored.points, breakdown: { result: scored.breakdown } },
    })
  }
}

// GET /api/leagues — list leagues the current user is a member of
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagues = await prisma.league.findMany({
      where: { members: { some: { userId: req.user!.id } } },
      select: { id: true, name: true, inviteCode: true, createdAt: true, createdBy: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ leagues })
  } catch (err) {
    next(err)
  }
})

// POST /api/leagues — create a league; creator is auto-added as first member
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
        inviteCode: generateInviteCode(),
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

// POST /api/leagues/join — join a league via invite code
router.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { inviteCode } = req.body ?? {}
    if (!inviteCode || typeof inviteCode !== 'string') {
      res.status(400).json({ error: 'inviteCode is required' })
      return
    }

    const league = await prisma.league.findUnique({ where: { inviteCode } })
    if (!league) {
      res.status(404).json({ error: 'Invalid invite code' })
      return
    }

    const alreadyMember = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId: req.user!.id } },
    })
    if (alreadyMember) {
      res.status(409).json({ error: 'Already a member of this league' })
      return
    }

    await prisma.leagueMember.create({
      data: { leagueId: league.id, userId: req.user!.id },
    })

    await backfillPoints(req.user!.id, league.id)

    const updated = await prisma.league.findUnique({
      where: { id: league.id },
      ...MEMBER_SELECT,
    })

    res.json({ league: updated })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/leaderboard — member standings for a league
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
      prisma.pointsLedger.findMany({
        where: { leagueId },
        select: { userId: true, points: true, breakdown: true },
      }),
    ])

    if (!league) {
      res.status(404).json({ error: 'League not found' })
      return
    }

    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    // Aggregate ledger rows per user
    const stats = new Map<string, { totalPoints: number; predictionsCount: number; exactScoreCount: number }>()
    for (const row of ledgerRows) {
      const s = stats.get(row.userId) ?? { totalPoints: 0, predictionsCount: 0, exactScoreCount: 0 }
      s.totalPoints += row.points
      s.predictionsCount++
      if ((row.breakdown as Record<string, unknown>)?.result === 'exact') s.exactScoreCount++
      stats.set(row.userId, s)
    }

    const leaderboard = league.members
      .map((m) => {
        const s = stats.get(m.userId) ?? { totalPoints: 0, predictionsCount: 0, exactScoreCount: 0 }
        return {
          userId: m.userId,
          name: m.user.name,
          avatarUrl: m.user.avatarUrl,
          avatarColor: m.user.avatarColor,
          totalPoints: s.totalPoints,
          predictionsCount: s.predictionsCount,
          exactScoreCount: s.exactScoreCount,
        }
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)

    res.json({ leaderboard })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id/predictions — every member's prediction for FINISHED
// matches only, with points. Predictions for upcoming matches stay hidden so
// nobody can copy picks before kickoff. Members only.
router.get('/:id/predictions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leagueId = req.params.id

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { members: { select: { userId: true } } },
    })

    if (!league) {
      res.status(404).json({ error: 'League not found' })
      return
    }

    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    const memberIds = league.members.map((m) => m.userId)

    const matches = await prisma.match.findMany({
      where: { status: 'FINISHED', homeScore: { not: null }, awayScore: { not: null } },
      orderBy: { kickoffTime: 'desc' },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        kickoffTime: true,
        homeScore: true,
        awayScore: true,
      },
    })

    const predictions = await prisma.prediction.findMany({
      where: { matchId: { in: matches.map((m) => m.id) }, userId: { in: memberIds } },
      select: { matchId: true, userId: true, predictedHome: true, predictedAway: true },
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
        const scored = calculatePoints(
          { predictedHome: p.predictedHome, predictedAway: p.predictedAway },
          { homeScore: match.homeScore!, awayScore: match.awayScore! }
        )
        return {
          userId: p.userId,
          predictedHome: p.predictedHome,
          predictedAway: p.predictedAway,
          points: scored.points,
          breakdown: scored.breakdown,
        }
      }),
    }))

    res.json({ matches: result })
  } catch (err) {
    next(err)
  }
})

// GET /api/leagues/:id — fetch league details; only accessible to members
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const league = await prisma.league.findUnique({
      where: { id: req.params.id },
      ...MEMBER_SELECT,
    })

    if (!league) {
      res.status(404).json({ error: 'League not found' })
      return
    }

    const isMember = league.members.some((m) => m.userId === req.user!.id)
    if (!isMember) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    res.json({ league })
  } catch (err) {
    next(err)
  }
})

export default router
