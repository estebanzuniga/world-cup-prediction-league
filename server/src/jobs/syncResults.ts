import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { calculatePoints } from '../services/scoring'

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'

interface FdoMatch {
  id: number
  status: string
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
  }
}

async function fetchFinishedMatches(): Promise<FdoMatch[]> {
  const res = await fetch(
    `${API_BASE}/competitions/${COMPETITION}/matches?status=FINISHED`,
    { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
  )
  if (!res.ok) {
    throw new Error(`football-data.org responded ${res.status} ${res.statusText}`)
  }
  const data = (await res.json()) as { matches: FdoMatch[] }
  return data.matches
}

export async function syncResults(): Promise<void> {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.warn('[syncResults] FOOTBALL_DATA_API_KEY not set — skipping')
    return
  }

  let matchesSynced = 0
  let ledgerRowsWritten = 0

  try {
    const fdoMatches = await fetchFinishedMatches()

    for (const fdoMatch of fdoMatches) {
      const { home: homeScore, away: awayScore } = fdoMatch.score.fullTime
      if (homeScore === null || awayScore === null) continue

      // Look up our record by the API's numeric ID first (fast path for matches
      // already synced once), then fall back to team names for seeded records
      // that were assigned custom externalIds at seed time.
      const apiExternalId = String(fdoMatch.id)
      let dbMatch =
        (await prisma.match.findUnique({ where: { externalId: apiExternalId } })) ??
        (await prisma.match.findFirst({
          where: {
            homeTeam: fdoMatch.homeTeam.name,
            awayTeam: fdoMatch.awayTeam.name,
          },
        }))

      if (!dbMatch) continue

      // Idempotent: skip matches already fully settled
      if (dbMatch.status === 'FINISHED' && dbMatch.homeScore !== null) continue

      const updated = await prisma.match.update({
        where: { id: dbMatch.id },
        data: { homeScore, awayScore, status: 'FINISHED' },
      })
      matchesSynced++

      // Resolve all predictions for this match, together with the user's league memberships
      const predictions = await prisma.prediction.findMany({
        where: { matchId: updated.id },
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
              userId_matchId_leagueId: {
                userId: prediction.userId,
                matchId: updated.id,
                leagueId,
              },
            },
            create: {
              userId: prediction.userId,
              matchId: updated.id,
              leagueId,
              points: scored.points,
              breakdown: { result: scored.breakdown },
            },
            update: {
              points: scored.points,
              breakdown: { result: scored.breakdown },
            },
          })
          ledgerRowsWritten++
        }
      }
    }

    console.log(
      `[syncResults] ${new Date().toISOString()} — synced ${matchesSynced} match(es), wrote ${ledgerRowsWritten} ledger row(s)`
    )
  } catch (err) {
    console.error('[syncResults] Sync failed:', err)
  }
}

// Every 5 minutes between noon and midnight UTC — covers all possible WC kickoff windows.
// The job is a no-op outside the active window because the API will return no
// newly finished matches, so this guard is belt-and-suspenders rather than critical.
export function registerSyncJob(): void {
  cron.schedule('*/5 12-23 * * *', () => void syncResults(), { timezone: 'UTC' })
  console.log('[syncResults] Job registered — */5 12-23 * * * UTC')
}
