import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendPush } from '../lib/webPush'

// In-memory guard: tracks match IDs we've already notified about so we don't
// send duplicate reminders across cron ticks that overlap the kickoff window.
const remindedMatchIds = new Set<string>()

export async function kickoffReminder(): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() + 25 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 35 * 60 * 1000)

  const upcoming = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      kickoffTime: { gte: windowStart, lte: windowEnd },
    },
  })

  if (upcoming.length === 0) return

  for (const match of upcoming) {
    if (remindedMatchIds.has(match.id)) continue
    remindedMatchIds.add(match.id)

    const alreadyPredicted = await prisma.prediction.findMany({
      where: { matchId: match.id },
      select: { userId: true },
    })
    const predictedUserIds = new Set(alreadyPredicted.map(p => p.userId))

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { notIn: [...predictedUserIds] } },
    })

    const staleIds: string[] = []
    for (const sub of subscriptions) {
      const result = await sendPush(sub, {
        title: 'Goalcaster · Predicción pendiente',
        body: `${match.homeTeam} vs ${match.awayTeam} arranca en 30 minutos`,
        url: '/',
      })
      if (result === 'gone') staleIds.push(sub.id)
    }

    if (staleIds.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } })
    }

    console.log(
      `[kickoffReminder] Notified ${subscriptions.length - staleIds.length} user(s) about ${match.homeTeam} vs ${match.awayTeam}`
    )
  }
}

export function registerKickoffReminderJob(): void {
  cron.schedule('*/5 * * * *', () => void kickoffReminder(), { timezone: 'UTC' })
  console.log('[kickoffReminder] Job registered — */5 * * * * UTC')
}
