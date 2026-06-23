import { Telegraf } from 'telegraf'
import { prisma } from '../lib/prisma'
import { settleMatch } from './syncResults'
import { toSpanish } from '../utils/countryNames'

export function registerTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!token || !adminChatId) {
    console.warn('[telegramBot] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set — skipping')
    return
  }

  const bot = new Telegraf(token)
  const isAdmin = (chatId: number) => String(chatId) === adminChatId

  bot.command('partidos', async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return
    const now = new Date()
    const matches = await prisma.match.findMany({
      where: { kickoffTime: { lte: now }, status: { not: 'FINISHED' } },
      orderBy: { kickoffTime: 'asc' },
    })
    if (matches.length === 0) {
      await ctx.reply('No hay partidos en curso.')
      return
    }
    const lines = matches.map((m) => `${m.id} · ${toSpanish(m.homeTeam)} vs ${toSpanish(m.awayTeam)}`)
    await ctx.reply(lines.join('\n'))
  })

  bot.hears(/^\/resultado (.+)$/, async (ctx) => {
    if (!isAdmin(ctx.chat.id)) return
    const parts = ctx.match[1].trim().split(/\s+/)
    if (parts.length < 3 || parts.length > 4) {
      await ctx.reply('Uso: /resultado <id> <golesLocal> <golesVisitante> [HOME|AWAY]')
      return
    }
    const [matchId, homeStr, awayStr, advancingArg] = parts
    const homeScore = parseInt(homeStr, 10)
    const awayScore = parseInt(awayStr, 10)
    if (isNaN(homeScore) || isNaN(awayScore)) {
      await ctx.reply('Los goles deben ser números.')
      return
    }

    const advancingTeam: 'HOME' | 'AWAY' | null =
      advancingArg === 'HOME' ? 'HOME' : advancingArg === 'AWAY' ? 'AWAY' : null
    const dbMatch = await prisma.match.findUnique({ where: { id: matchId } })
    if (!dbMatch) {
      await ctx.reply('Partido no encontrado. Usa /partidos para ver la lista.')
      return
    }

    const isDraw = homeScore === awayScore
    const isKnockout = dbMatch.stage === 'ROUND_OF_16' || dbMatch.stage === 'QUARTER_FINALS' || dbMatch.stage === 'SEMI_FINALS' || dbMatch.stage === 'FINAL'
    if (isKnockout && isDraw && advancingArg !== 'HOME' && advancingArg !== 'AWAY') {
      await ctx.reply('En caso de empate debes indicar quién avanza: /resultado <id> <golesLocal> <golesVisitante> HOME|AWAY')
      return
    }

    try {
      const { predictionsProcessed } = await settleMatch(dbMatch.id, homeScore, awayScore, advancingTeam)
      await ctx.reply(
        `✅ ${toSpanish(dbMatch.homeTeam)} ${homeScore}–${awayScore} ${toSpanish(dbMatch.awayTeam)}\n${predictionsProcessed} pronósticos procesados.`
      )
    } catch (err) {
      await ctx.reply(`❌ Error: ${err instanceof Error ? err.message : 'desconocido'}`)
    }
  })

  bot.launch()
  console.log('[telegramBot] Bot registrado y escuchando')
}
