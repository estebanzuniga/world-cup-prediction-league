import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { isPredictionLocked } from '../lib/lockout'

const router = Router()
router.use(requireAuth)

// POST /api/predictions — submit or update a prediction (upsert)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId, predictedHome, predictedAway, predictedAdvancing } = req.body ?? {}

    if (
      !matchId ||
      predictedHome === undefined ||
      predictedAway === undefined
    ) {
      res.status(400).json({ error: 'matchId, predictedHome, and predictedAway are required' })
      return
    }

    if (
      !Number.isInteger(predictedHome) ||
      !Number.isInteger(predictedAway) ||
      predictedHome < 0 ||
      predictedAway < 0
    ) {
      res.status(400).json({ error: 'predictedHome and predictedAway must be non-negative integers' })
      return
    }

    if (predictedAdvancing !== undefined && predictedAdvancing !== null && predictedAdvancing !== 'HOME' && predictedAdvancing !== 'AWAY') {
      res.status(400).json({ error: 'predictedAdvancing must be HOME, AWAY, or null' })
      return
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) {
      res.status(404).json({ error: 'Match not found' })
      return
    }

    if (isPredictionLocked(match.kickoffTime)) {
      res.status(403).json({ error: 'Predictions are locked for this match' })
      return
    }

    const KNOCKOUT_STAGES = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL']
    const isKnockout = match.stage !== null && KNOCKOUT_STAGES.includes(match.stage)
    const isDraw = predictedHome === predictedAway
    if (isKnockout && isDraw && !predictedAdvancing) {
      res.status(400).json({ error: 'predictedAdvancing is required for knockout draw predictions' })
      return
    }

    const advancing = isKnockout && isDraw ? (predictedAdvancing as 'HOME' | 'AWAY') : null

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: req.user!.id, matchId } },
      create: { userId: req.user!.id, matchId, predictedHome, predictedAway, predictedAdvancing: advancing },
      update: { predictedHome, predictedAway, predictedAdvancing: advancing, submittedAt: new Date() },
    })

    res.status(201).json({ prediction })
  } catch (err) {
    next(err)
  }
})

// GET /api/predictions?matchId=X — returns the caller's own prediction only.
// Other users' predictions are never exposed here; they become visible via the
// leaderboard route only after a match reaches FINISHED status.
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { matchId } = req.query
    if (!matchId || typeof matchId !== 'string') {
      res.status(400).json({ error: 'matchId query parameter is required' })
      return
    }

    const prediction = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: req.user!.id, matchId } },
    })

    if (!prediction) {
      res.status(404).json({ error: 'No prediction found for this match' })
      return
    }

    res.json({ prediction })
  } catch (err) {
    next(err)
  }
})

export default router
