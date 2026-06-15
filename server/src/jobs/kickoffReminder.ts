import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { sendPush } from '../lib/webPush'
import { toSpanish } from '../utils/countryNames'

// In-memory guard: tracks match IDs we've already notified about so we don't
// send duplicate reminders across cron ticks that overlap the kickoff window.
const remindedMatchIds = new Set<string>()

export async function kickoffReminder(): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() + 10 * 60 * 1000 - 30 * 1000) // 9m30s from now
  const windowEnd = new Date(now.getTime() + 10 * 60 * 1000 + 30 * 1000) // 10m30s from now

  const upcoming = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      kickoffTime: { gt: windowStart, lt: windowEnd },
    },
  })

  if (upcoming.length === 0) return

  for (const match of upcoming) {
    if (remindedMatchIds.has(match.id)) continue
    remindedMatchIds.add(match.id)

    const subscriptions = await prisma.pushSubscription.findMany()

    const staleIds: string[] = []
    for (const sub of subscriptions) {
      const result = await sendPush(sub, {
        title: 'Goalcaster',
        body: `${toSpanish(match.homeTeam)} vs ${toSpanish(match.awayTeam)} comienza en 10 minutos`,
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
  cron.schedule('*/10 * * * *', () => void kickoffReminder(), { timezone: 'UTC' })
  console.log('[kickoffReminder] Job registered — */10 * * * * UTC')
}
