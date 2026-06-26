import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Inserting email templates...');

  const templates = [
    {
      name: 'Modern Website Redesign Offer (Short)',
      subject: 'Upgrade {{businessName}}\'s Digital Presence',
      body: `Hi {{contactPerson}},

I noticed that {{businessName}} has a solid business but your website could use a modern touch to truly reflect your brand's quality.

We specialize in designing and developing fast, modern, and beautiful websites that help businesses like yours stand out and convert more visitors into customers. 

Would you be open to a quick 10-minute chat to see some examples of what we could do for you?

Best regards,
The Web Design Team`,
    },
    {
      name: 'Modern Website Redesign Offer (Detailed)',
      subject: 'A modern website for {{businessName}}',
      body: `Hello {{contactPerson}},

My name is Alex and I help businesses in the {{industry}} industry upgrade their digital presence.

I was looking at {{businessName}}'s website and noticed a few areas where a modern design could significantly improve your user experience and conversion rates. In today's market, having a fast, mobile-friendly, and aesthetically pleasing website is crucial for building trust with potential clients.

We can help you build a brand new, custom website that not only looks stunning but is optimized for search engines to bring in more traffic.

If you're interested in seeing how a new website could impact your business, I'd love to share some of our recent work and discuss some ideas. Let me know if you have some time next week.

Best,
Alex
Lead Designer`,
    },
    {
      name: 'Website Audit & Redesign Proposal',
      subject: 'Ideas for improving {{businessName}}\'s website',
      body: `Hi {{contactPerson}},

I hope this email finds you well. 

I recently came across {{businessName}} and was really impressed by your offerings in {{location}}. However, I noticed that your current website might not be doing your business justice. It appears a bit outdated and might be holding back your true potential online.

Our team designs premium, modern websites tailored specifically for growing businesses. A visually appealing and highly functional website can dramatically increase your credibility and customer engagement.

I have a few ideas on how we can revamp your site. Would you be open to a brief call to discuss them?

Looking forward to hearing from you,

Best regards,
Digital Solutions Team`,
    }
  ];

  for (const template of templates) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: template.name }
    });
    
    if (!existing) {
      await prisma.emailTemplate.create({
        data: template
      });
      console.log('Created template: ' + template.name);
    } else {
      console.log('Template already exists: ' + template.name);
    }
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
