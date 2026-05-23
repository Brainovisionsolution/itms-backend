const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { isApproved: false } });
  console.log('Pending users count:', users.length);
}
main().finally(() => prisma.$disconnect());
