import { PrismaClient } from '@prisma/client';
import { COMPLAINT_CATEGORIES } from './seed-data/categories';

const prisma = new PrismaClient();

async function seedUsers() {
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
}

async function seedComplaintCategories() {
  for (const category of COMPLAINT_CATEGORIES) {
    await prisma.complaintCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  console.info('✅ Seeded complaint categories:');
  for (const category of COMPLAINT_CATEGORIES) {
    console.info(`   ${category.sortOrder}. ${category.slug} — ${category.name}`);
  }
}

async function main() {
  await seedUsers();
  await seedComplaintCategories();
  console.info('');
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
