import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper to upsert system cadence templates (createdById = null)
async function upsertSystemCadence(data: {
  name: string
  temperatureBand: string
  description: string
  totalSteps: number
  totalDays: number
}) {
  // Check if exists
  const existing = await prisma.cadenceTemplate.findFirst({
    where: { name: data.name, createdById: null },
  })
  
  if (existing) {
    return existing
  }
  
  return prisma.cadenceTemplate.create({
    data: {
      ...data,
      isDefault: true,
      isActive: true,
      createdById: null,
    },
  })
}

async function seedCadenceTemplates() {
  console.log('Seeding LCE v2.3.1 Cadence Templates...')

  // HOT Cadence (14 days, 7 steps)
  const hotCadence = await upsertSystemCadence({
    name: 'HOT',
    temperatureBand: 'HOT',
    description: 'Aggressive follow-up for high-priority leads (14 days, 7 steps)',
    totalSteps: 7,
    totalDays: 14,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: hotCadence.id, stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
      { cadenceId: hotCadence.id, stepNumber: 2, dayOffset: 1, actionType: 'CALL', description: 'Quick follow-up' },
      { cadenceId: hotCadence.id, stepNumber: 3, dayOffset: 2, actionType: 'SMS', description: 'Text message' },
      { cadenceId: hotCadence.id, stepNumber: 4, dayOffset: 4, actionType: 'CALL', description: 'Persistence call' },
      { cadenceId: hotCadence.id, stepNumber: 5, dayOffset: 6, actionType: 'RVM', description: 'Ringless voicemail' },
      { cadenceId: hotCadence.id, stepNumber: 6, dayOffset: 9, actionType: 'CALL', description: 'Re-attempt call' },
      { cadenceId: hotCadence.id, stepNumber: 7, dayOffset: 14, actionType: 'CALL', description: 'Final attempt' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ HOT cadence created with 7 steps')

  // WARM Cadence (21 days, 5 steps)
  const warmCadence = await upsertSystemCadence({
    name: 'WARM',
    temperatureBand: 'WARM',
    description: 'Standard follow-up for medium-priority leads (21 days, 5 steps)',
    totalSteps: 5,
    totalDays: 21,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: warmCadence.id, stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
      { cadenceId: warmCadence.id, stepNumber: 2, dayOffset: 3, actionType: 'CALL', description: 'Follow-up call' },
      { cadenceId: warmCadence.id, stepNumber: 3, dayOffset: 7, actionType: 'SMS', description: 'Check-in text' },
      { cadenceId: warmCadence.id, stepNumber: 4, dayOffset: 14, actionType: 'CALL', description: 'Re-engage call' },
      { cadenceId: warmCadence.id, stepNumber: 5, dayOffset: 21, actionType: 'CALL', description: 'Final attempt' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ WARM cadence created with 5 steps')

  // COLD Cadence (45 days, 3 steps)
  const coldCadence = await upsertSystemCadence({
    name: 'COLD',
    temperatureBand: 'COLD',
    description: 'Slow follow-up for low-priority leads (45 days, 3 steps)',
    totalSteps: 3,
    totalDays: 45,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: coldCadence.id, stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
      { cadenceId: coldCadence.id, stepNumber: 2, dayOffset: 14, actionType: 'CALL', description: 'Follow-up call' },
      { cadenceId: coldCadence.id, stepNumber: 3, dayOffset: 45, actionType: 'CALL', description: 'Final attempt' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ COLD cadence created with 3 steps')

  // ICE Cadence (90 days, 2 steps)
  const iceCadence = await upsertSystemCadence({
    name: 'ICE',
    temperatureBand: 'ICE',
    description: 'Minimal follow-up for very low-priority leads (90 days, 2 steps)',
    totalSteps: 2,
    totalDays: 90,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: iceCadence.id, stepNumber: 1, dayOffset: 0, actionType: 'CALL', description: 'Initial call' },
      { cadenceId: iceCadence.id, stepNumber: 2, dayOffset: 90, actionType: 'CALL', description: 'Check back' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ ICE cadence created with 2 steps')

  // GENTLE Cadence (30 days, 3 steps) - for re-engagement
  const gentleCadence = await upsertSystemCadence({
    name: 'GENTLE',
    temperatureBand: 'WARM',
    description: 'Soft re-engagement for stale engaged leads (30 days, 3 steps)',
    totalSteps: 3,
    totalDays: 30,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: gentleCadence.id, stepNumber: 1, dayOffset: 0, actionType: 'SMS', description: 'Soft check-in' },
      { cadenceId: gentleCadence.id, stepNumber: 2, dayOffset: 7, actionType: 'CALL', description: 'Follow-up call' },
      { cadenceId: gentleCadence.id, stepNumber: 3, dayOffset: 30, actionType: 'CALL', description: 'Final re-engagement' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ GENTLE cadence created with 3 steps')

  // ANNUAL Cadence (365 days, 1 step) - for long-term nurture
  const annualCadence = await upsertSystemCadence({
    name: 'ANNUAL',
    temperatureBand: 'ICE',
    description: 'Annual check-in for long-term nurture leads (365 days, 1 step)',
    totalSteps: 1,
    totalDays: 365,
  })

  await prisma.cadenceStep.createMany({
    data: [
      { cadenceId: annualCadence.id, stepNumber: 1, dayOffset: 365, actionType: 'CALL', description: 'Annual check-in' },
    ],
    skipDuplicates: true,
  })
  console.log('✓ ANNUAL cadence created with 1 step')

  console.log('\n✅ All LCE v2.3.1 Cadence Templates seeded successfully!')
}

seedCadenceTemplates()
  .catch((e) => {
    console.error('Error seeding cadence templates:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
