import cron, { ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { runScanner } from './scanner.service';
import { generateAuditPdf } from './pdf.service';
import { sendDailySummaryEmail } from './email.service';
import { settingsService } from './settings.service';

export const runDailyScanner = async () => {
  const automationEnabled = await settingsService.get('automationEnabled', 'true');
  if (automationEnabled === 'false') {
    logger.info('Daily Automation Scan skipped: Disabled in Settings.');
    return;
  }

  logger.info('Starting Daily Automation Scan...');

  // Create start log
  const log = await prisma.activityLog.create({
    data: {
      action: 'CRON_DAILY_SCAN_START',
      details: { timestamp: new Date().toISOString() },
    },
  });

  try {
    // 1. Find unscanned leads (Leads with 0 WebsiteAudits and not deleted)
    const unscannedLeads = await prisma.lead.findMany({
      where: {
        isDeleted: false,
        website: { not: null },
        websiteAudits: {
          none: {}
        }
      },
    });

    logger.info(`Found ${unscannedLeads.length} unscanned leads for daily scan.`);

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // 2. Process sequentially
    for (const lead of unscannedLeads) {
      try {
        logger.info(`Daily Cron: Processing lead ${lead.id} - ${lead.businessName}`);
        
        // Create pending audit
        const audit = await prisma.websiteAudit.create({
          data: {
            leadId: lead.id,
            targetUrl: lead.website!, // we filtered null above
            status: 'PENDING',
          },
        });

        // 3. Run full scanner pipeline (Screenshot, Lighthouse, AI, Scoring)
        await runScanner(audit.id, lead.website!);

        // Fetch audit again to check status
        const completedAudit = await prisma.websiteAudit.findUnique({ where: { id: audit.id } });
        
        if (completedAudit && completedAudit.status === 'DONE') {
          // 4. Generate PDF
          const pdfBuffer = await generateAuditPdf(audit.id);
          
          // 5. Save PDF to disk
          const filename = `report-${lead.id}-${audit.id}.pdf`;
          const filepath = path.join(process.cwd(), 'public', 'reports', filename);
          fs.writeFileSync(filepath, pdfBuffer);
          const reportUrl = `/reports/${filename}`;

          // 6. Create Report record
          await prisma.report.create({
            data: {
              leadId: lead.id,
              websiteAuditId: audit.id,
              reportUrl,
            }
          });

          successCount++;
        } else {
          failedCount++;
          errors.push({ leadId: lead.id, error: 'Audit failed or timed out' });
        }

      } catch (error: any) {
        logger.error(`Daily Cron: Failed to process lead ${lead.id}`, { error });
        failedCount++;
        errors.push({ leadId: lead.id, error: error.message || 'Unknown error' });
      }
    }

    // 7. Log completion
    await prisma.activityLog.create({
      data: {
        action: 'CRON_DAILY_SCAN_COMPLETE',
        details: {
          totalProcessed: unscannedLeads.length,
          successCount,
          failedCount,
          errors,
        },
      },
    });

    // 8. Calculate Daily Stats and Send Email
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const [newLeadsCount, hotLeadsCount, topOpportunitiesRecords] = await Promise.all([
      prisma.lead.count({ where: { isDeleted: false, createdAt: { gte: yesterday } } }),
      prisma.lead.count({ where: { isDeleted: false, leadScore: { gte: 80 } } }),
      prisma.lead.findMany({
        where: { isDeleted: false, leadScore: { gte: 80 } },
        orderBy: { leadScore: 'desc' },
        take: 5,
        select: { id: true, businessName: true, website: true, leadScore: true },
      }),
    ]);

    await sendDailySummaryEmail({
      newLeadsCount,
      hotLeadsCount,
      scannedCount: successCount,
      topOpportunities: topOpportunitiesRecords.map(o => ({ ...o, website: o.website || '' })),
    });

    logger.info(`Daily Automation Scan complete. Success: ${successCount}, Failed: ${failedCount}`);

  } catch (error: any) {
    logger.error('Daily Automation Scan failed entirely', { error });
    await prisma.activityLog.create({
      data: {
        action: 'CRON_DAILY_SCAN_FAILED',
        details: { error: error.message || 'Unknown error' },
      },
    });
  }
};


let currentTask: ScheduledTask | null = null;

export const initCronJobs = async () => {
  const schedule = await settingsService.get('cronSchedule', '0 6 * * *');
  
  if (currentTask) {
    currentTask.stop();
  }

  currentTask = cron.schedule(schedule, () => {
    runDailyScanner();
  }, {
    timezone: "America/New_York"
  });

  logger.info(`⏱️ Cron jobs initialized (Daily Scanner scheduled: ${schedule})`);
};

export const restartCronJob = async () => {
  logger.info('Restarting cron job with new schedule...');
  await initCronJobs();
};
