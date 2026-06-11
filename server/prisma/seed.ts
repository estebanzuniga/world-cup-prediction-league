import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

// All 72 group stage matches — 2026 FIFA World Cup
// Kickoff times in UTC (source: official schedule, ET converted to UTC by +4h)
const matches = [
  // ── Group A: Mexico, South Korea, Czechia, South Africa ──────────────────
  { externalId: 'wc2026-a-1', homeTeam: 'Mexico',       awayTeam: 'South Africa', kickoffTime: new Date('2026-06-11T19:00:00Z') },
  { externalId: 'wc2026-a-2', homeTeam: 'South Korea',  awayTeam: 'Czechia',      kickoffTime: new Date('2026-06-12T02:00:00Z') },
  { externalId: 'wc2026-a-3', homeTeam: 'Czechia',      awayTeam: 'South Africa', kickoffTime: new Date('2026-06-18T16:00:00Z') },
  { externalId: 'wc2026-a-4', homeTeam: 'Mexico',       awayTeam: 'South Korea',  kickoffTime: new Date('2026-06-19T01:00:00Z') },
  { externalId: 'wc2026-a-5', homeTeam: 'South Africa', awayTeam: 'South Korea',  kickoffTime: new Date('2026-06-25T01:00:00Z') },
  { externalId: 'wc2026-a-6', homeTeam: 'Czechia',      awayTeam: 'Mexico',       kickoffTime: new Date('2026-06-25T01:00:00Z') },

  // ── Group B: Canada, Bosnia and Herzegovina, Qatar, Switzerland ───────────
  { externalId: 'wc2026-b-1', homeTeam: 'Canada',               awayTeam: 'Bosnia and Herzegovina', kickoffTime: new Date('2026-06-12T19:00:00Z') },
  { externalId: 'wc2026-b-2', homeTeam: 'Qatar',                awayTeam: 'Switzerland',            kickoffTime: new Date('2026-06-13T19:00:00Z') },
  { externalId: 'wc2026-b-3', homeTeam: 'Switzerland',          awayTeam: 'Bosnia and Herzegovina', kickoffTime: new Date('2026-06-18T19:00:00Z') },
  { externalId: 'wc2026-b-4', homeTeam: 'Canada',               awayTeam: 'Qatar',                  kickoffTime: new Date('2026-06-18T22:00:00Z') },
  { externalId: 'wc2026-b-5', homeTeam: 'Switzerland',          awayTeam: 'Canada',                 kickoffTime: new Date('2026-06-24T19:00:00Z') },
  { externalId: 'wc2026-b-6', homeTeam: 'Bosnia and Herzegovina', awayTeam: 'Qatar',                kickoffTime: new Date('2026-06-24T19:00:00Z') },

  // ── Group C: Brazil, Morocco, Haiti, Scotland ─────────────────────────────
  { externalId: 'wc2026-c-1', homeTeam: 'Brazil',   awayTeam: 'Morocco',  kickoffTime: new Date('2026-06-13T22:00:00Z') },
  { externalId: 'wc2026-c-2', homeTeam: 'Haiti',    awayTeam: 'Scotland', kickoffTime: new Date('2026-06-14T01:00:00Z') },
  { externalId: 'wc2026-c-3', homeTeam: 'Scotland', awayTeam: 'Morocco',  kickoffTime: new Date('2026-06-19T22:00:00Z') },
  { externalId: 'wc2026-c-4', homeTeam: 'Brazil',   awayTeam: 'Haiti',    kickoffTime: new Date('2026-06-20T00:30:00Z') },
  { externalId: 'wc2026-c-5', homeTeam: 'Scotland', awayTeam: 'Brazil',   kickoffTime: new Date('2026-06-24T22:00:00Z') },
  { externalId: 'wc2026-c-6', homeTeam: 'Morocco',  awayTeam: 'Haiti',    kickoffTime: new Date('2026-06-24T22:00:00Z') },

  // ── Group D: USA, Paraguay, Australia, Türkiye ────────────────────────────
  { externalId: 'wc2026-d-1', homeTeam: 'United States', awayTeam: 'Paraguay',   kickoffTime: new Date('2026-06-13T01:00:00Z') },
  { externalId: 'wc2026-d-2', homeTeam: 'Australia',     awayTeam: 'Türkiye',    kickoffTime: new Date('2026-06-13T04:00:00Z') },
  { externalId: 'wc2026-d-3', homeTeam: 'United States', awayTeam: 'Australia',  kickoffTime: new Date('2026-06-19T19:00:00Z') },
  { externalId: 'wc2026-d-4', homeTeam: 'Türkiye',       awayTeam: 'Paraguay',   kickoffTime: new Date('2026-06-20T03:00:00Z') },
  { externalId: 'wc2026-d-5', homeTeam: 'United States', awayTeam: 'Türkiye',    kickoffTime: new Date('2026-06-26T02:00:00Z') },
  { externalId: 'wc2026-d-6', homeTeam: 'Paraguay',      awayTeam: 'Australia',  kickoffTime: new Date('2026-06-26T02:00:00Z') },

  // ── Group E: Germany, Ivory Coast, Ecuador, Curaçao ──────────────────────
  { externalId: 'wc2026-e-1', homeTeam: 'Germany',     awayTeam: 'Curaçao',     kickoffTime: new Date('2026-06-14T17:00:00Z') },
  { externalId: 'wc2026-e-2', homeTeam: 'Ivory Coast', awayTeam: 'Ecuador',     kickoffTime: new Date('2026-06-14T23:00:00Z') },
  { externalId: 'wc2026-e-3', homeTeam: 'Germany',     awayTeam: 'Ivory Coast', kickoffTime: new Date('2026-06-20T20:00:00Z') },
  { externalId: 'wc2026-e-4', homeTeam: 'Ecuador',     awayTeam: 'Curaçao',     kickoffTime: new Date('2026-06-21T00:00:00Z') },
  { externalId: 'wc2026-e-5', homeTeam: 'Ecuador',     awayTeam: 'Germany',     kickoffTime: new Date('2026-06-25T20:00:00Z') },
  { externalId: 'wc2026-e-6', homeTeam: 'Curaçao',     awayTeam: 'Ivory Coast', kickoffTime: new Date('2026-06-25T20:00:00Z') },

  // ── Group F: Netherlands, Japan, Sweden, Tunisia ──────────────────────────
  { externalId: 'wc2026-f-1', homeTeam: 'Netherlands', awayTeam: 'Japan',       kickoffTime: new Date('2026-06-14T20:00:00Z') },
  { externalId: 'wc2026-f-2', homeTeam: 'Sweden',      awayTeam: 'Tunisia',     kickoffTime: new Date('2026-06-15T02:00:00Z') },
  { externalId: 'wc2026-f-3', homeTeam: 'Netherlands', awayTeam: 'Sweden',      kickoffTime: new Date('2026-06-20T17:00:00Z') },
  { externalId: 'wc2026-f-4', homeTeam: 'Tunisia',     awayTeam: 'Japan',       kickoffTime: new Date('2026-06-20T04:00:00Z') },
  { externalId: 'wc2026-f-5', homeTeam: 'Tunisia',     awayTeam: 'Netherlands', kickoffTime: new Date('2026-06-25T23:00:00Z') },
  { externalId: 'wc2026-f-6', homeTeam: 'Japan',       awayTeam: 'Sweden',      kickoffTime: new Date('2026-06-25T23:00:00Z') },

  // ── Group G: Belgium, Egypt, Iran, New Zealand ───────────────────────────
  { externalId: 'wc2026-g-1', homeTeam: 'Belgium',     awayTeam: 'Egypt',       kickoffTime: new Date('2026-06-15T19:00:00Z') },
  { externalId: 'wc2026-g-2', homeTeam: 'Iran',        awayTeam: 'New Zealand', kickoffTime: new Date('2026-06-16T01:00:00Z') },
  { externalId: 'wc2026-g-3', homeTeam: 'Belgium',     awayTeam: 'Iran',        kickoffTime: new Date('2026-06-21T19:00:00Z') },
  { externalId: 'wc2026-g-4', homeTeam: 'New Zealand', awayTeam: 'Egypt',       kickoffTime: new Date('2026-06-22T01:00:00Z') },
  { externalId: 'wc2026-g-5', homeTeam: 'New Zealand', awayTeam: 'Belgium',     kickoffTime: new Date('2026-06-27T03:00:00Z') },
  { externalId: 'wc2026-g-6', homeTeam: 'Egypt',       awayTeam: 'Iran',        kickoffTime: new Date('2026-06-27T03:00:00Z') },

  // ── Group H: Spain, Saudi Arabia, Uruguay, Cape Verde ────────────────────
  { externalId: 'wc2026-h-1', homeTeam: 'Spain',       awayTeam: 'Cape Verde',   kickoffTime: new Date('2026-06-15T16:00:00Z') },
  { externalId: 'wc2026-h-2', homeTeam: 'Saudi Arabia', awayTeam: 'Uruguay',     kickoffTime: new Date('2026-06-15T22:00:00Z') },
  { externalId: 'wc2026-h-3', homeTeam: 'Spain',       awayTeam: 'Saudi Arabia', kickoffTime: new Date('2026-06-21T16:00:00Z') },
  { externalId: 'wc2026-h-4', homeTeam: 'Uruguay',     awayTeam: 'Cape Verde',   kickoffTime: new Date('2026-06-21T22:00:00Z') },
  { externalId: 'wc2026-h-5', homeTeam: 'Uruguay',     awayTeam: 'Spain',        kickoffTime: new Date('2026-06-27T00:00:00Z') },
  { externalId: 'wc2026-h-6', homeTeam: 'Cape Verde',  awayTeam: 'Saudi Arabia', kickoffTime: new Date('2026-06-27T00:00:00Z') },

  // ── Group I: France, Senegal, Iraq, Norway ───────────────────────────────
  { externalId: 'wc2026-i-1', homeTeam: 'France',  awayTeam: 'Senegal', kickoffTime: new Date('2026-06-16T19:00:00Z') },
  { externalId: 'wc2026-i-2', homeTeam: 'Iraq',    awayTeam: 'Norway',  kickoffTime: new Date('2026-06-16T22:00:00Z') },
  { externalId: 'wc2026-i-3', homeTeam: 'France',  awayTeam: 'Iraq',    kickoffTime: new Date('2026-06-22T21:00:00Z') },
  { externalId: 'wc2026-i-4', homeTeam: 'Norway',  awayTeam: 'Senegal', kickoffTime: new Date('2026-06-23T00:00:00Z') },
  { externalId: 'wc2026-i-5', homeTeam: 'Norway',  awayTeam: 'France',  kickoffTime: new Date('2026-06-26T19:00:00Z') },
  { externalId: 'wc2026-i-6', homeTeam: 'Senegal', awayTeam: 'Iraq',    kickoffTime: new Date('2026-06-26T19:00:00Z') },

  // ── Group J: Argentina, Algeria, Austria, Jordan ─────────────────────────
  { externalId: 'wc2026-j-1', homeTeam: 'Argentina', awayTeam: 'Algeria',   kickoffTime: new Date('2026-06-16T19:00:00Z') },
  { externalId: 'wc2026-j-2', homeTeam: 'Austria',   awayTeam: 'Jordan',    kickoffTime: new Date('2026-06-17T04:00:00Z') },
  { externalId: 'wc2026-j-3', homeTeam: 'Argentina', awayTeam: 'Austria',   kickoffTime: new Date('2026-06-22T17:00:00Z') },
  { externalId: 'wc2026-j-4', homeTeam: 'Jordan',    awayTeam: 'Algeria',   kickoffTime: new Date('2026-06-23T03:00:00Z') },
  { externalId: 'wc2026-j-5', homeTeam: 'Jordan',    awayTeam: 'Argentina', kickoffTime: new Date('2026-06-28T02:00:00Z') },
  { externalId: 'wc2026-j-6', homeTeam: 'Algeria',   awayTeam: 'Austria',   kickoffTime: new Date('2026-06-28T02:00:00Z') },

  // ── Group K: Portugal, DR Congo, Colombia, Uzbekistan ────────────────────
  { externalId: 'wc2026-k-1', homeTeam: 'Portugal',              awayTeam: 'DR Congo',              kickoffTime: new Date('2026-06-17T17:00:00Z') },
  { externalId: 'wc2026-k-2', homeTeam: 'Uzbekistan',            awayTeam: 'Colombia',              kickoffTime: new Date('2026-06-18T02:00:00Z') },
  { externalId: 'wc2026-k-3', homeTeam: 'Portugal',              awayTeam: 'Uzbekistan',            kickoffTime: new Date('2026-06-23T17:00:00Z') },
  { externalId: 'wc2026-k-4', homeTeam: 'Colombia',              awayTeam: 'DR Congo',              kickoffTime: new Date('2026-06-23T20:00:00Z') },
  { externalId: 'wc2026-k-5', homeTeam: 'Colombia',              awayTeam: 'Portugal',              kickoffTime: new Date('2026-06-27T23:30:00Z') },
  { externalId: 'wc2026-k-6', homeTeam: 'DR Congo',              awayTeam: 'Uzbekistan',            kickoffTime: new Date('2026-06-27T23:30:00Z') },

  // ── Group L: England, Croatia, Ghana, Panama ─────────────────────────────
  { externalId: 'wc2026-l-1', homeTeam: 'England', awayTeam: 'Croatia', kickoffTime: new Date('2026-06-17T20:00:00Z') },
  { externalId: 'wc2026-l-2', homeTeam: 'Ghana',   awayTeam: 'Panama',  kickoffTime: new Date('2026-06-17T23:00:00Z') },
  { externalId: 'wc2026-l-3', homeTeam: 'England', awayTeam: 'Ghana',   kickoffTime: new Date('2026-06-23T20:00:00Z') },
  { externalId: 'wc2026-l-4', homeTeam: 'Panama',  awayTeam: 'Croatia', kickoffTime: new Date('2026-06-23T23:00:00Z') },
  { externalId: 'wc2026-l-5', homeTeam: 'Panama',  awayTeam: 'England', kickoffTime: new Date('2026-06-27T21:00:00Z') },
  { externalId: 'wc2026-l-6', homeTeam: 'Croatia', awayTeam: 'Ghana',   kickoffTime: new Date('2026-06-27T21:00:00Z') },
]

const NAME_ALIASES: Record<string, string> = {
  'Korea Republic':               'South Korea',
  'IR Iran':                      'Iran',
  "Côte d'Ivoire":                'Ivory Coast',
  'Congo DR':                     'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'USA':                          'United States',
  'Czech Republic':               'Czechia',
  'Bosnia-Herzegovina':           'Bosnia and Herzegovina',
  'Turkey':                       'Türkiye',
  'Cape Verde Islands':           'Cape Verde',
}

async function syncCrests() {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) {
    console.log('FOOTBALL_DATA_API_KEY not set — skipping crest sync.')
    return
  }

  console.log('Syncing team crests from football-data.org…')
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': key },
  })
  if (!res.ok) {
    console.error(`Crest sync failed: ${res.status} ${res.statusText}`)
    return
  }

  const { matches: apiMatches } = await res.json() as {
    matches: Array<{ homeTeam: { name: string; crest: string }; awayTeam: { name: string; crest: string } }>
  }
  const resolve = (name: string) => NAME_ALIASES[name] ?? name
  let updated = 0

  for (const m of apiMatches) {
    if (!m.homeTeam.name || !m.awayTeam.name) continue
    const home = resolve(m.homeTeam.name)
    const away = resolve(m.awayTeam.name)
    let result = await prisma.match.updateMany({
      where: { homeTeam: home, awayTeam: away },
      data: { homeTeamCrestUrl: m.homeTeam.crest, awayTeamCrestUrl: m.awayTeam.crest },
    })
    if (result.count === 0) {
      result = await prisma.match.updateMany({
        where: { homeTeam: away, awayTeam: home },
        data: { homeTeamCrestUrl: m.awayTeam.crest, awayTeamCrestUrl: m.homeTeam.crest },
      })
    }
    if (result.count > 0) updated++
  }

  console.log(`Updated crests for ${updated} match(es).`)
}

async function main() {
  console.log(`Seeding ${matches.length} group stage matches…`)

  for (const match of matches) {
    await prisma.match.upsert({
      where: { externalId: match.externalId },
      update: { homeTeam: match.homeTeam, awayTeam: match.awayTeam, kickoffTime: match.kickoffTime },
      create: { ...match, status: 'SCHEDULED' },
    })
  }

  console.log('Done.')
  await syncCrests()
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
