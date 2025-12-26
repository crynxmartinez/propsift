/**
 * DockInsight 2.2.2: Backfill denormalized counters for existing records
 * 
 * Run with: npx ts-node scripts/backfill-counters.ts
 * Or: npx tsx scripts/backfill-counters.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillCounters() {
  console.log('Starting counter backfill...')
  
  // Get all records
  const records = await prisma.record.findMany({
    select: { id: true, createdById: true }
  })
  
  console.log(`Found ${records.length} records to process`)
  
  let processed = 0
  const batchSize = 100
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    
    await Promise.all(batch.map(async (record) => {
      const [phoneCount, emailCount, tagCount, motivationCount] = await Promise.all([
        prisma.recordPhoneNumber.count({ where: { recordId: record.id } }),
        prisma.recordEmail.count({ where: { recordId: record.id } }),
        prisma.recordTag.count({ where: { recordId: record.id } }),
        prisma.recordMotivation.count({ where: { recordId: record.id } })
      ])
      
      await prisma.record.update({
        where: { id: record.id },
        data: { phoneCount, emailCount, tagCount, motivationCount }
      })
    }))
    
    processed += batch.length
    console.log(`Processed ${processed}/${records.length} records`)
  }
  
  console.log('Counter backfill complete!')
}

async function backfillCreatedByIds() {
  console.log('Starting createdById backfill for junction entities...')
  
  // Update RecordTag createdById from parent Record
  const recordTags = await prisma.recordTag.findMany({
    where: { createdById: null },
    include: { record: { select: { createdById: true } } }
  })
  
  console.log(`Found ${recordTags.length} RecordTags to update`)
  
  for (const rt of recordTags) {
    if (rt.record.createdById) {
      await prisma.recordTag.update({
        where: { id: rt.id },
        data: { createdById: rt.record.createdById }
      })
    }
  }
  
  // Update RecordMotivation createdById from parent Record
  const recordMotivations = await prisma.recordMotivation.findMany({
    where: { createdById: null },
    include: { record: { select: { createdById: true } } }
  })
  
  console.log(`Found ${recordMotivations.length} RecordMotivations to update`)
  
  for (const rm of recordMotivations) {
    if (rm.record.createdById) {
      await prisma.recordMotivation.update({
        where: { id: rm.id },
        data: { createdById: rm.record.createdById }
      })
    }
  }
  
  // Update RecordPhoneNumber createdById from parent Record
  const recordPhones = await prisma.recordPhoneNumber.findMany({
    where: { createdById: null },
    include: { record: { select: { createdById: true } } }
  })
  
  console.log(`Found ${recordPhones.length} RecordPhoneNumbers to update`)
  
  for (const rp of recordPhones) {
    if (rp.record.createdById) {
      await prisma.recordPhoneNumber.update({
        where: { id: rp.id },
        data: { createdById: rp.record.createdById }
      })
    }
  }
  
  // Update RecordEmail createdById from parent Record
  const recordEmails = await prisma.recordEmail.findMany({
    where: { createdById: null },
    include: { record: { select: { createdById: true } } }
  })
  
  console.log(`Found ${recordEmails.length} RecordEmails to update`)
  
  for (const re of recordEmails) {
    if (re.record.createdById) {
      await prisma.recordEmail.update({
        where: { id: re.id },
        data: { createdById: re.record.createdById }
      })
    }
  }
  
  console.log('CreatedById backfill complete!')
}

async function main() {
  try {
    await backfillCreatedByIds()
    await backfillCounters()
    console.log('All backfills complete!')
  } catch (error) {
    console.error('Backfill failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
