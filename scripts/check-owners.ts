import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get all owner accounts (not team members)
  const owners = await prisma.user.findMany({
    where: {
      role: 'owner',
      accountOwnerId: null
    },
    select: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      isPlatformAdmin: true,
      status: true,
      createdAt: true,
      teamMembers: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  console.log('='.repeat(60))
  console.log('OWNER ACCOUNTS REPORT')
  console.log('='.repeat(60))
  console.log(`Total Owner Accounts: ${owners.length}`)
  console.log('')

  owners.forEach((owner, index) => {
    console.log(`${index + 1}. ${owner.email}${owner.isPlatformAdmin ? ' [PLATFORM ADMIN]' : ''}`)
    console.log(`   Name: ${owner.name || 'N/A'}`)
    console.log(`   Company: ${owner.companyName || 'N/A'}`)
    console.log(`   Status: ${owner.status}`)
    console.log(`   Created: ${owner.createdAt.toLocaleDateString()}`)
    console.log(`   Team Members: ${owner.teamMembers.length}`)
    
    if (owner.teamMembers.length > 0) {
      owner.teamMembers.forEach((member, mIndex) => {
        console.log(`      ${mIndex + 1}. ${member.email} (${member.role}) - ${member.status}`)
      })
    }
    console.log('')
  })

  // Summary
  const totalMembers = owners.reduce((sum, o) => sum + o.teamMembers.length, 0)
  console.log('='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Owner Accounts: ${owners.length}`)
  console.log(`Total Team Members: ${totalMembers}`)
  console.log(`Total Users: ${owners.length + totalMembers}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
