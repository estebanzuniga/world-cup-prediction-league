import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { calculatePoints } from '../src/services/scoring'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

function randomScore(): number {
  return Math.floor(Math.random() * 4)
}

async function main() {
  const matches = await prisma.match.findMany({
    where: { externalId: { startsWith: 'test-' } },
    orderBy: { externalId: 'asc' },
  })

  if (matches.length === 0) {
    console.log('No test matches found — run createTestMatches.ts first.')
    return
  }

  for (const match of matches) {
    const homeScore = randomScore()
    const awayScore = randomScore()

    await prisma.match.update({
      where: { id: match.id },
      data: { homeScore, awayScore, status: 'FINISHED' },
    })
    console.log(`FT: ${match.homeTeam} ${homeScore}–${awayScore} ${match.awayTeam}`)

    // Same settlement as syncResults: one ledger row per prediction × league membership
    const predictions = await prisma.prediction.findMany({
      where: { matchId: match.id },
      include: { user: { include: { memberships: { select: { leagueId: true } } } } },
    })

    for (const prediction of predictions) {
      const scored = calculatePoints(
        { predictedHome: prediction.predictedHome, predictedAway: prediction.predictedAway },
        { homeScore, awayScore }
      )

      for (const { leagueId } of prediction.user.memberships) {
        await prisma.pointsLedger.upsert({
          where: {
            userId_matchId_leagueId: { userId: prediction.userId, matchId: match.id, leagueId },
          },
          create: {
            userId: prediction.userId,
            matchId: match.id,
            leagueId,
            points: scored.points,
            breakdown: { result: scored.breakdown },
          },
          update: {
            points: scored.points,
            breakdown: { result: scored.breakdown },
          },
        })
      }

      console.log(
        `  ${prediction.user.name}: predicted ${prediction.predictedHome}–${prediction.predictedAway} → ${scored.points} point(s) (${scored.breakdown})`
      )
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
