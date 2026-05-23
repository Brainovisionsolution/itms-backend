const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { email: 'bnsgamer7yt@gmail.com' },
    data: { password: hashedPassword }
  });
  console.log('Admin password reset to: admin123');
  process.exit(0);
}

reset();
