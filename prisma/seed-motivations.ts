import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultMotivations = [
  'Absentee Owner',
  'Vacant Property',
  'Pre-Foreclosure',
  'Tax Lien',
  'Probate',
  'Divorce',
  'Code Violation',
  'High Equity',
  'Tired Landlord',
  'Out of State Owner',
  'Free & Clear',
  'Senior Owner',
  'Long-term Owner',
  'Failed Listing',
  'Off Market',
];

async function main() {
  console.log('Seeding default motivations...');

  for (const name of defaultMotivations) {
    const existing = await prisma.motivation.findFirst({
      where: { name },
    });

    if (!existing) {
      await prisma.motivation.create({
        data: { name },
      });
      console.log(`Created: ${name}`);
    } else {
      console.log(`Already exists: ${name}`);
    }
  }

  console.log('Done seeding motivations!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
