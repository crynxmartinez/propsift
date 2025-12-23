import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@propsift.com' },
    update: {},
    create: {
      email: 'admin@propsift.com',
      password: hashedPassword,
      name: 'Admin',
    },
  })

  console.log('Created admin user:', user.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
