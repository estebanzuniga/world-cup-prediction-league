import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const prisma = new PrismaClient()

// Kickoff 2 hours from now so predictions are open (they lock at kickoffTime)
const kickoffTime = new Date(Date.now() + 15 * 60 * 1000)

const testMatches = [
  { externalId: 'test-1', homeTeam: 'Testland', awayTeam: 'Mockovia' },
  { externalId: 'test-2', homeTeam: 'Sampleton', awayTeam: 'Fakeria' },
  { externalId: 'test-3', homeTeam: 'Dummystan', awayTeam: 'Stubland' },
  { externalId: 'test-4', homeTeam: 'Demo Republic', awayTeam: 'Trial Islands' },
]

async function main() {
  for (const match of testMatches) {
    // Re-runnable: resets a previously settled test match back to SCHEDULED
    const row = await prisma.match.upsert({
      where: { externalId: match.externalId },
      update: { kickoffTime, status: 'SCHEDULED', homeScore: null, awayScore: null },
      create: { ...match, kickoffTime, status: 'SCHEDULED' },
    })
    console.log(
      `Ready: ${row.homeTeam} vs ${row.awayTeam} — kickoff ${row.kickoffTime.toISOString()} (id ${row.id})`
    )
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
