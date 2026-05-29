import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      phoneNumber: '+919876543210',
      name: 'AWAAZ Admin',
      role: 'ADMIN' as const,
    },
    {
      phoneNumber: '+919876543211',
      name: 'AWAAZ MLA',
      role: 'MLA' as const,
    },
    {
      phoneNumber: '+919876543212',
      name: 'AWAAZ Citizen',
      role: 'CITIZEN' as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { phoneNumber: user.phoneNumber },
      update: {
        name: user.name,
        role: user.role,
        isVerified: true,
      },
      create: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
        isVerified: true,
      },
    });
  }

  console.info('✅ Seeded users: admin, mla, citizen');
  console.info('   Admin:   +919876543210');
  console.info('   MLA:     +919876543211');
  console.info('   Citizen: +919876543212');
  console.info('   Use OTP flow (OTP_DEV_MODE) to obtain tokens for seeded phones.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
