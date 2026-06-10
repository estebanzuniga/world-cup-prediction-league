import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { calculatePoints } from '../services/scoring'

const router = Router()
router.use(requireAuth)

// GET /api/matches — all matches, ordered by kickoff.
// For FINISHED matches the caller's prediction and earned points are included.
// Predictions for non-finished matches are never exposed.
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [matches, myPredictions] = await Promise.all([
      prisma.match.findMany({
        orderBy: { kickoffTime: 'asc' },
        select: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          kickoffTime: true,
          status: true,
          homeScore: true,
          awayScore: true,
        },
      }),
      prisma.prediction.findMany({
        where: { userId: req.user!.id },
        select: { matchId: true, predictedHome: true, predictedAway: true },
      }),
    ])

    const predMap = new Map(myPredictions.map((p) => [p.matchId, p]))

    const result = matches.map((match) => {
      const pred = predMap.get(match.id)
      const isFinished = match.status === 'FINISHED' && match.homeScore !== null && match.awayScore !== null

      let myPrediction: {
        predictedHome: number
        predictedAway: number
        points: number
        breakdown: string
      } | null = null

      if (isFinished && pred) {
        const scored = calculatePoints(
          { predictedHome: pred.predictedHome, predictedAway: pred.predictedAway },
          { homeScore: match.homeScore!, awayScore: match.awayScore! }
        )
        myPrediction = {
          predictedHome: pred.predictedHome,
          predictedAway: pred.predictedAway,
          points: scored.points,
          breakdown: scored.breakdown,
        }
      }

      return { ...match, myPrediction }
    })

    res.json({ matches: result })
  } catch (err) {
    next(err)
  }
})

export default router
