import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const records = await prisma.record.findMany({
    take: 5,
    select: {
      id: true,
      cadencePhase: true,
      cadenceState: true,
      currentPhase: true,
      cadenceType: true,
      cadenceStep: true,
      queueTier: true,
    },
  })
  
  console.log('Sample records:')
  console.log(JSON.stringify(records, null, 2))
  
  const counts = await prisma.record.groupBy({
    by: ['cadencePhase'],
    _count: true,
  })
  
  console.log('\nCadence phase counts:')
  console.log(JSON.stringify(counts, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
