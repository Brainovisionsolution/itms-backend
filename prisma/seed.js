const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
  const bcrypt = require('bcryptjs');
  const email = 'admin@itms.com';
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'System Admin',
      email: email,
      password: hashedPassword,
      role: 'ADMIN',
      isVerified: true,
      isApproved: true,
    },
  });

  console.log('Default Admin seeded: admin@itms.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
