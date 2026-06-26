const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const updated = await prisma.websiteAudit.updateMany({
    where: { 
      status: { in: ['PENDING', 'RUNNING'] }, 
      createdAt: { lt: fiveMinsAgo } 
    },
    data: { 
      status: 'FAILED', 
      errorMsg: 'Scanner timed out or was interrupted by server restart.' 
    }
  });
  console.log('Fixed ' + updated.count + ' stuck audits.');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
