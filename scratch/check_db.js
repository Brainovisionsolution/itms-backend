const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const taskCount = await prisma.task.count();
  const groupCount = await prisma.group.count();
  const domainCount = await prisma.domain.count();
  console.log(`Users: ${userCount}, Tasks: ${taskCount}, Groups: ${groupCount}, Domains: ${domainCount}`);
  
  const tasks = await prisma.task.findMany({ include: { group: true } });
  console.log('Tasks:', JSON.stringify(tasks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
