import * as path from 'path'
import * as dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()
const API_BASE = 'https://api.football-data.org/v4'

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
const resolve = (name: string | null) => (name ? NAME_ALIASES[name] ?? name : name)

interface FdoTeam {
  name: string | null
  crest: string | null
}

interface FdoMatch {
  id: number
  utcDate: string
  status: string
  stage: string
  homeTeam: FdoTeam
  awayTeam: FdoTeam
}

// Everything that isn't the group stage: LAST_32, LAST_16,
// QUARTER_FINALS, SEMI_FINALS, THIRD_PLACE, FINAL
const KNOCKOUT_STAGES = new Set([
  'LAST_32',
  'LAST_16',
  'QUARTER_FINALS',
  'SEMI_FINALS',
  'THIRD_PLACE',
  'FINAL',
])

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

  const { matches }: { matches: FdoMatch[] } = (await res.json()) as { matches: FdoMatch[] }

  const knockout = matches
    .filter((m) => KNOCKOUT_STAGES.has(m.stage))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))

  let upserted = 0

  for (const m of knockout) {
    let homeTeam = resolve(m.homeTeam.name)
    let awayTeam = resolve(m.awayTeam.name)

    // Match.homeTeam/awayTeam are non-nullable — skip fixtures whose teams
    // aren't drawn yet (API returns null names). Re-run once they're set.
    if (!homeTeam) {
      homeTeam = 'Por definir'
    }
    if (!awayTeam) {
      awayTeam = 'Por definir'
    }

    // externalId = the API's numeric id (as string) so syncResults can later
    // settle these via its fast externalId lookup. Idempotent on externalId.
    await prisma.match.upsert({
      where: { externalId: String(m.id) },
      update: {
        homeTeam,
        awayTeam,
        homeTeamCrestUrl: m.homeTeam.crest,
        awayTeamCrestUrl: m.awayTeam.crest,
        kickoffTime: new Date(m.utcDate),
      },
      create: {
        externalId: String(m.id),
        homeTeam,
        awayTeam,
        homeTeamCrestUrl: m.homeTeam.crest,
        awayTeamCrestUrl: m.awayTeam.crest,
        kickoffTime: new Date(m.utcDate),
        status: 'SCHEDULED',
      },
    })
    upserted++
  }

  console.log(`Upserted ${upserted} knockout match(es).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
