import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@propsift.com'
  
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isPlatformAdmin: true }
  })

  if (!user) {
    console.log(`❌ User with email "${email}" not found.`)
    console.log('\nExisting users:')
    const users = await prisma.user.findMany({
      select: { email: true, isPlatformAdmin: true },
      take: 10
    })
    users.forEach(u => console.log(`  - ${u.email} (admin: ${u.isPlatformAdmin})`))
    return
  }

  if (user.isPlatformAdmin) {
    console.log(`✅ User "${email}" is already a Platform Admin.`)
    return
  }

  // Set as platform admin
  await prisma.user.update({
    where: { email },
    data: { isPlatformAdmin: true }
  })

  console.log(`✅ Successfully set "${email}" as Platform Admin!`)
  console.log(`\nYou can now access /admin after logging in.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
