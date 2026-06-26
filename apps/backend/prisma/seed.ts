import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@rsorangetech.com' },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);
    await prisma.user.create({
      data: {
        email: 'admin@rsorangetech.com',
        name: 'RSOrangeTech Admin',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    console.log('✅ Admin user created: admin@rsorangetech.com / Admin@1234');
  } else {
    console.log('ℹ️  Admin user already exists, skipping.');
  }

  // Create sample analyst
  const existingAnalyst = await prisma.user.findUnique({
    where: { email: 'analyst@rsorangetech.com' },
  });

  if (!existingAnalyst) {
    const passwordHash = await bcrypt.hash('Analyst@1234', 12);
    await prisma.user.create({
      data: {
        email: 'analyst@rsorangetech.com',
        name: 'Lead Analyst',
        passwordHash,
        role: Role.SALES,
      },
    });
    console.log('✅ Analyst user created: analyst@rsorangetech.com / Analyst@1234');
  }

  // Create sample leads for demo
  const sampleLeads = [
    {
      businessName: 'TechVista Solutions',
      website: 'https://techvista.example.com',
      email: 'contact@techvista.example.com',
      phone: '+1-555-0100',
      industry: 'Software',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      status: 'NEW' as const,
      leadScore: 78,
    },
    {
      businessName: 'GreenLeaf Organics',
      website: 'https://greenleaf.example.com',
      email: 'hello@greenleaf.example.com',
      phone: '+1-555-0200',
      industry: 'E-commerce',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      status: 'CONTACTED' as const,
      leadScore: 62,
    },
    {
      businessName: 'Horizon Builders',
      website: 'https://horizon.example.com',
      email: 'info@horizon.example.com',
      phone: '+1-555-0300',
      industry: 'Real Estate',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      status: 'INTERESTED' as const,
      leadScore: 91,
    },
    {
      businessName: 'SwiftLogix',
      website: 'https://swiftlogix.example.com',
      email: 'support@swiftlogix.example.com',
      phone: '+1-555-0400',
      industry: 'Logistics',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      status: 'FOLLOW_UP' as const,
      leadScore: 85,
    },
    {
      businessName: 'NovaMed Health',
      website: 'https://novamed.example.com',
      industry: 'Healthcare',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      status: 'NEW' as const,
      leadScore: 55,
    },
  ];

  for (const lead of sampleLeads) {
    const existing = await prisma.lead.findUnique({
      where: { website: lead.website },
    });
    if (!existing) {
      const created = await prisma.lead.create({ data: lead });

      // Add a sample website audit for leads in active pipeline stages
      if (lead.status === 'INTERESTED' || lead.status === 'FOLLOW_UP') {
        const audit = await prisma.websiteAudit.create({
          data: {
            leadId: created.id,
            targetUrl: lead.website,
            status: 'DONE',
            performanceScore: Math.floor(Math.random() * 40) + 60,
            seoScore: Math.floor(Math.random() * 40) + 55,
            accessibilityScore: Math.floor(Math.random() * 30) + 65,
            bestPracticesScore: Math.floor(Math.random() * 25) + 70,
            aiSummary: 'Website shows strong fundamentals but has room for improvement in performance optimization and SEO metadata. Recommend reaching out with a focused audit proposal.',
          },
        });

        // Add some dummy issues
        await prisma.auditIssue.createMany({
          data: [
            {
              websiteAuditId: audit.id,
              type: 'PERFORMANCE',
              title: 'Reduce unused JavaScript',
              description: 'Remove dead code to reduce payload size.',
              scoreImpact: -12,
            },
            {
              websiteAuditId: audit.id,
              type: 'SEO',
              title: 'Missing meta description',
              description: 'A meta description is highly recommended for SEO.',
              scoreImpact: -8,
            }
          ]
        });
      }

      console.log(`✅ Lead created: ${lead.businessName}`);
    }
  }

  // Create Standard Email Templates
  const standardTemplates = [
    {
      name: 'Missing Chatbot - Engagement Pitch',
      subject: "Missed customer inquiries on {{businessName}}'s website?",
      body: `Hi {{contactPerson}},\n\nI was reviewing {{businessName}}'s website today and noticed that you don't currently have an instant chatbot or live chat assistant installed.\n\nIn today's fast-paced digital market, over 65% of website visitors expect instant answers. Without an automated conversational tool, potential leads often leave before filling out a contact form.\n\nAt RSOrangeTech, we build custom 24/7 lead generation chatbots designed specifically for businesses in {{location}}. Our bots instantly qualify visitors, answer common questions, and book appointments directly into your calendar.\n\nWould you be open to a 10-minute demo next week to see how a custom chatbot could increase {{businessName}}'s conversions?\n\nBest regards,\nRSOrangeTech Growth Team\nhttps://rsorangetech.com`,
    },
    {
      name: 'Missing AI Chatbot - Upgrade Pitch',
      subject: 'Upgrade {{businessName}} to an intelligent 24/7 AI Chatbot',
      body: `Hi {{contactPerson}},\n\nI explored {{businessName}}'s website and noticed you don't yet have an AI-powered conversational assistant to engage your website traffic.\n\nTraditional static websites lose valuable conversion opportunities during off-hours. With a cutting-edge AI Chatbot trained specifically on your company's services, pricing, and FAQs, you can provide human-like customer support and capture leads 24 hours a day, 7 days a week.\n\nAt RSOrangeTech, we deploy custom-trained AI assistants that seamlessly integrate into your website without slowing down page load times.\n\nCan we schedule a quick call this week to show you a live prototype built for {{businessName}}?\n\nBest regards,\nRSOrangeTech AI Solutions\nhttps://rsorangetech.com`,
    },
    {
      name: 'Basic Live Chat Only - Automation Pitch',
      subject: "Automate {{businessName}}'s live chat to capture 24/7 leads",
      body: `Hi {{contactPerson}},\n\nI noticed that {{businessName}} currently uses a basic live chat widget on your website. While live chat is great when your staff is online, what happens when inquiries come in after hours or during busy peak times?\n\nMany businesses relying solely on manual live chat experience delayed response times, leading to dropped leads. By upgrading to an automated AI Chatbot hybrid system, your widget can instantly handle routine inquiries 24/7, qualify high-intent prospects, and only route complex conversations to your human team when available.\n\nAt RSOrangeTech, we help companies supercharge their existing chat workflows with intelligent automation.\n\nWould you be open to a brief walkthrough of how we can automate your customer engagement?\n\nBest regards,\nRSOrangeTech Automation Team\nhttps://rsorangetech.com`,
    },
    {
      name: 'Slow Site - Speed & Performance Pitch',
      subject: 'Crucial speed & performance enhancement for {{businessName}}',
      body: `Hi {{contactPerson}},\n\nOur automated site audit recently analyzed {{businessName}}'s website performance and flagged some significant page load delays that are likely impacting your user experience and search engine rankings.\n\nGoogle prioritizes fast-loading websites. If a page takes longer than 3 seconds to load, over 53% of mobile visitors bounce immediately. Enhancing your site speed not only boosts your Google SEO scores but directly increases your conversion rates.\n\nAt RSOrangeTech, our web engineering team specializes in deep core web vitals optimization, payload reduction, and modern speed enhancements.\n\nAre you available for a brief call this week to review your Lighthouse speed scores and discuss how we can make your website lightning-fast?\n\nBest regards,\nRSOrangeTech Web Performance Team\nhttps://rsorangetech.com`,
    },
    {
      name: 'No WhatsApp - Integration Pitch',
      subject: 'Connect with {{businessName}} visitors instantly via WhatsApp',
      body: `Hi {{contactPerson}},\n\nWhile browsing {{businessName}}'s website, I noticed that visitors don't have a direct way to initiate an instant WhatsApp chat with your business.\n\nWhatsApp is currently the highest-converting communication channel, with open rates exceeding 98%. Customers prefer sending a quick WhatsApp message over filling out cumbersome email forms or waiting on hold. Integrating a direct 1-click WhatsApp widget allows you to capture visitor phone numbers instantly and continue the conversation on their preferred app.\n\nAt RSOrangeTech, we implement seamless WhatsApp Business API integrations with automated greeting flows and lead tagging.\n\nWould you have 5 minutes this week for a quick chat on integrating WhatsApp into {{businessName}}'s website?\n\nBest regards,\nRSOrangeTech Digital Strategy Team\nhttps://rsorangetech.com`,
    },
  ];

  for (const tpl of standardTemplates) {
    const existing = await prisma.emailTemplate.findFirst({ where: { name: tpl.name } });
    if (!existing) {
      await prisma.emailTemplate.create({ data: tpl });
      console.log(`✅ Email template created: ${tpl.name}`);
    } else {
      console.log(`ℹ️  Email template already exists: ${tpl.name}`);
    }
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
