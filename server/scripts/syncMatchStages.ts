import * as path from 'path'
import * as dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()
const API_BASE = 'https://api.football-data.org/v4'

interface FdoTeam {
  name: string | null
}

interface FdoMatch {
  id: number
  stage: string
  homeTeam: FdoTeam
  awayTeam: FdoTeam
}

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    console.error('FOOTBALL_DATA_API_KEY is not set')
    process.exit(1)
  }

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': apiKey },
  })
  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`)
    process.exit(1)
  }

  const { matches }: { matches: FdoMatch[] } = (await res.json()) as { matches: FdoMatch[] }

  let updated = 0
  let unresolved = 0

  // Every API match carries its stage — find our row and stamp it directly.
  for (const m of matches) {
    // Knockout rows store the API numeric id as externalId; group rows use a
    // custom externalId, so fall back to matching on team names (both orders).
    const dbMatch = await prisma.match.findUnique({ where: { externalId: String(m.id) } })

    if (!dbMatch) {
      console.warn(`  No DB match for id ${m.id} - (${m.stage})`)
      unresolved++
      continue
    }

    if (dbMatch.stage === m.stage) continue

    await prisma.match.update({ where: { id: dbMatch.id }, data: { stage: m.stage } })
    updated++
  }

  console.log(`Set stage on ${updated} match(es). Unresolved: ${unresolved}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
