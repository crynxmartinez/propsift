import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  // Create/update platform admin account
  const user = await prisma.user.upsert({
    where: { email: 'admin@propsift.com' },
    update: {
      isPlatformAdmin: true,
      role: 'owner',
    },
    create: {
      email: 'admin@propsift.com',
      password: hashedPassword,
      name: 'PropSift Admin',
      isPlatformAdmin: true,
      role: 'owner',
    },
  })

  console.log('Created/updated platform admin:', user.email, '(isPlatformAdmin:', user.isPlatformAdmin, ')')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
