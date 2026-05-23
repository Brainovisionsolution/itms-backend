const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    await prisma.user.delete({
      where: { email: 'admin@itms.com' }
    });
    console.log('Super Admin user deleted successfully.');
  } catch (err) {
    console.log('Super Admin user was already removed or does not exist.');
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
