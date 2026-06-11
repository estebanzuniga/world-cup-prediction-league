import * as path from 'path'
import * as dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()
const API_BASE = 'https://api.football-data.org/v4'

interface FdoTeam {
  name: string
  crest: string
}

interface FdoMatch {
  homeTeam: FdoTeam
  awayTeam: FdoTeam
}

async function main() {
  const key = process.env.FOOTBALL_DATA_API_KEY
  if (!key) {
    console.error('FOOTBALL_DATA_API_KEY is not set')
    process.exit(1)
  }

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': key },
  })

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const { matches }: { matches: FdoMatch[] } = await res.json() as { matches: FdoMatch[] }

  let updated = 0

  // Map API team names → our DB team names for cases where they differ
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

  const resolve = (name: string) => NAME_ALIASES[name] ?? name

  for (const m of matches) {
    if (!m.homeTeam.name || !m.awayTeam.name) continue
    const home = resolve(m.homeTeam.name)
    const away = resolve(m.awayTeam.name)
    // Try normal order first, then flipped (seed home/away may differ from API)
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
    if (result.count > 0) {
      updated++
    } else {
      console.warn(`  No match found for: ${home} vs ${away} (API: ${m.homeTeam.name} vs ${m.awayTeam.name})`)
    }
  }

  console.log(`Updated crests for ${updated} match(es).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
