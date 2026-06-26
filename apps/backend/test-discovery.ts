import { runDiscovery } from './src/services/discovery.service';
import { prisma } from './src/config/database';

async function test() {
  console.log('Running discovery...');
  await runDiscovery();
  
  const leads = await prisma.lead.findMany({
    where: { source: 'GOOGLE_DISCOVERY' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log('Latest 5 Discovered Leads:');
  console.log(JSON.stringify(leads, null, 2));
}

test().catch(console.error).finally(() => process.exit(0));
