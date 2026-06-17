import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { calculatePoints } from '../services/scoring'
import { sendPush } from '../lib/webPush'
import { toSpanish } from '../utils/countryNames'

const API_BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'

interface FdoMatch {
  id: number
  status: string
  homeTeam: { name: string; crest: string }
  awayTeam: { name: string; crest: string }
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

export async function settleMatch(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ predictionsProcessed: number }> {
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: 'FINISHED' },
  })
  console.log(`[settleMatch] Settled: ${updated.homeTeam} ${homeScore}–${awayScore} ${updated.awayTeam}`)

  const predictions = await prisma.prediction.findMany({
    where: { matchId: updated.id },
    include: { user: { include: { memberships: { select: { leagueId: true } } } } },
  })

  const staleSubIds: string[] = []

  for (const prediction of predictions) {
    const scored = calculatePoints(
      { predictedHome: prediction.predictedHome, predictedAway: prediction.predictedAway },
      { homeScore, awayScore }
    )
    console.log(
      `[settleMatch]   ${prediction.user.name ?? prediction.userId} predicted ${prediction.predictedHome}–${prediction.predictedAway} → ${scored.points}pt (${scored.breakdown})`
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
    }

    const pointsLabel =
      scored.points === 3 ? '+3 puntos' : scored.points === 1 ? '+1 punto' : '+0 puntos'
    const emoji = scored.points === 3 ? '🎯' : scored.points === 1 ? '✅' : '❌'
    const subs = await prisma.pushSubscription.findMany({ where: { userId: prediction.userId } })
    for (const sub of subs) {
      const result = await sendPush(sub, {
        title: `${toSpanish(updated.homeTeam)} vs ${toSpanish(updated.awayTeam)} · Resultado`,
        body: `El partido terminó ${homeScore}–${awayScore} · ${pointsLabel} ${emoji}`,
        url: '/',
      })
      if (result === 'gone') staleSubIds.push(sub.id)
    }
  }

  if (staleSubIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleSubIds } } })
  }

  return { predictionsProcessed: predictions.length }
}

export async function syncResults(): Promise<void> {
  if (!process.env.FOOTBALL_DATA_API_KEY) {
    console.warn('[syncResults] FOOTBALL_DATA_API_KEY not set — skipping')
    return
  }

  const startedAt = new Date().toISOString()
  console.log(`[syncResults] ${startedAt} — starting sync`)

  let matchesSynced = 0

  try {
    const fdoMatches = await fetchFinishedMatches()
    console.log(`[syncResults] API returned ${fdoMatches.length} finished match(es)`)

    for (const fdoMatch of fdoMatches) {
      const { home: homeScore, away: awayScore } = fdoMatch.score.fullTime
      if (homeScore === null || awayScore === null) continue

      // Look up our record by the API's numeric ID first (fast path for matches
      // already synced once), then fall back to team names for seeded records
      // that were assigned custom externalIds at seed time.
      const apiExternalId = String(fdoMatch.id)
      const dbMatch =
        (await prisma.match.findUnique({ where: { externalId: apiExternalId } })) ??
        (await prisma.match.findFirst({
          where: {
            homeTeam: fdoMatch.homeTeam.name,
            awayTeam: fdoMatch.awayTeam.name,
          },
        }))

      if (!dbMatch) {
        console.warn(`[syncResults] No DB match found for: ${fdoMatch.homeTeam.name} vs ${fdoMatch.awayTeam.name}`)
        continue
      }

      // Idempotent: skip matches already fully settled
      if (dbMatch.status === 'FINISHED' && dbMatch.homeScore !== null) continue

      await prisma.match.update({
        where: { id: dbMatch.id },
        data: {
          homeTeamCrestUrl: fdoMatch.homeTeam.crest,
          awayTeamCrestUrl: fdoMatch.awayTeam.crest,
        },
      })

      await settleMatch(dbMatch.id, homeScore, awayScore)
      matchesSynced++
    }

    if (matchesSynced === 0) {
      console.log(`[syncResults] Nothing new to settle`)
    } else {
      console.log(`[syncResults] Done — settled ${matchesSynced} match(es)`)
    }
  } catch (err) {
    console.error('[syncResults] Sync failed:', err)
  }
}

export function registerSyncJob(): void {
  cron.schedule('*/1 * * * *', () => void syncResults(), { timezone: 'UTC' })
  console.log('[syncResults] Job registered — */1 * * * * UTC')
}
