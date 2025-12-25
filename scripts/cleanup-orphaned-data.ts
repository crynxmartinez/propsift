import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupOrphanedData() {
  console.log('Starting cleanup of orphaned data (where createdById is null)...\n')

  // Delete orphaned records
  const deletedRecords = await prisma.record.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedRecords.count} orphaned records`)

  // Delete orphaned tags
  const deletedTags = await prisma.tag.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedTags.count} orphaned tags`)

  // Delete orphaned motivations
  const deletedMotivations = await prisma.motivation.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedMotivations.count} orphaned motivations`)

  // Delete orphaned statuses
  const deletedStatuses = await prisma.status.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedStatuses.count} orphaned statuses`)

  // Delete orphaned task templates
  const deletedTaskTemplates = await prisma.taskTemplate.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedTaskTemplates.count} orphaned task templates`)

  // Delete orphaned filter templates
  const deletedFilterTemplates = await prisma.filterTemplate.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedFilterTemplates.count} orphaned filter templates`)

  // Delete orphaned filter folders
  const deletedFilterFolders = await prisma.filterFolder.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedFilterFolders.count} orphaned filter folders`)

  // Delete orphaned custom field definitions
  const deletedCustomFields = await prisma.customFieldDefinition.deleteMany({
    where: { createdById: null }
  })
  console.log(`Deleted ${deletedCustomFields.count} orphaned custom field definitions`)

  console.log('\nCleanup complete!')
}

cleanupOrphanedData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
