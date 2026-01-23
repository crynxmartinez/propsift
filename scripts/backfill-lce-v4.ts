/**
 * Backfill script to sync cadencePhase from currentPhase
 * and set proper queueTier values for existing records
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting LCE v4.0 backfill...')

  // 1. Sync cadencePhase from currentPhase
  const syncResult = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "cadencePhase" = "currentPhase" 
    WHERE "cadencePhase" = 'NEW' AND "currentPhase" != 'NEW'
  `
  console.log(`Synced cadencePhase for ${syncResult} records`)

  // 2. Update queueTier based on cadencePhase
  // Tier 2: NEW leads
  const tier2 = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "queueTier" = 2 
    WHERE "cadencePhase" = 'NEW' AND "cadenceState" = 'ACTIVE'
  `
  console.log(`Set queueTier=2 for ${tier2} NEW records`)

  // Tier 3: BLITZ_1 and BLITZ_2
  const tier3 = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "queueTier" = 3 
    WHERE "cadencePhase" IN ('BLITZ_1', 'BLITZ_2') AND "cadenceState" = 'ACTIVE'
  `
  console.log(`Set queueTier=3 for ${tier3} BLITZ records`)

  // Tier 5: TEMPERATURE cadence
  const tier5 = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "queueTier" = 5 
    WHERE "cadencePhase" = 'TEMPERATURE' AND "cadenceState" = 'ACTIVE'
  `
  console.log(`Set queueTier=5 for ${tier5} TEMPERATURE records`)

  // Tier 7: DEEP_PROSPECT (needs verification)
  const tier7 = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "queueTier" = 7 
    WHERE "cadencePhase" = 'DEEP_PROSPECT'
  `
  console.log(`Set queueTier=7 for ${tier7} DEEP_PROSPECT records`)

  // Tier 9: NURTURE and others
  const tier9 = await prisma.$executeRaw`
    UPDATE "Record" 
    SET "queueTier" = 9 
    WHERE "cadencePhase" IN ('NURTURE', 'COMPLETED', 'ENGAGED') 
       OR "cadenceState" NOT IN ('ACTIVE', 'NOT_ENROLLED')
  `
  console.log(`Set queueTier=9 for ${tier9} NURTURE/inactive records`)

  // 3. Show final counts
  const counts = await prisma.record.groupBy({
    by: ['cadencePhase'],
    _count: true,
  })
  console.log('\nFinal cadencePhase counts:')
  console.log(JSON.stringify(counts, null, 2))

  const tierCounts = await prisma.record.groupBy({
    by: ['queueTier'],
    _count: true,
  })
  console.log('\nFinal queueTier counts:')
  console.log(JSON.stringify(tierCounts, null, 2))

  console.log('\nBackfill complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
