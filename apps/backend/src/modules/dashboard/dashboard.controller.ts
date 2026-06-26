import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';

// GET /api/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { industry, status, dateRange, minScore, maxScore } = req.query;

    const where: any = { isDeleted: false };

    if (industry) where.industry = String(industry);
    if (status) where.status = String(status);
    
    if (minScore || maxScore) {
      where.leadScore = {};
      if (minScore) where.leadScore.gte = Number(minScore);
      if (maxScore) where.leadScore.lte = Number(maxScore);
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let fromDate = new Date();
      if (dateRange === '7d') fromDate.setDate(now.getDate() - 7);
      if (dateRange === '30d') fromDate.setDate(now.getDate() - 30);
      if (dateRange === '90d') fromDate.setDate(now.getDate() - 90);
      if (dateRange !== 'all') {
        where.createdAt = { gte: fromDate };
      }
    }

    // Determine Hot, Warm, Cold Leads based on score thresholds (Hot >= 80, Warm 60-79, Cold < 60)
    const [
      totalLeads,
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      leadsByStatus,
      recentLeads,
      recentScans,
      businessesFound,
      businessesRejected,
      duplicatesRemoved,
      blacklistedBusinesses,
      qualifiedLeads,
      hotLeads,
      emailsSentCount,
    ] = await Promise.all([
      prisma.lead.count({ where }),

      prisma.lead.count({ where: { ...where, leadScore: { gte: 80 } } }),
      prisma.lead.count({ where: { ...where, leadScore: { gte: 60, lt: 80 } } }),
      prisma.lead.count({ where: { ...where, leadScore: { lt: 60 } } }),

      prisma.lead.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),

      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          businessName: true,
          website: true,
          status: true,
          leadScore: true,
          createdAt: true,
        },
      }),

      // Recent Scans (Audit History)
      prisma.websiteAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          lead: { select: { businessName: true, website: true } }
        }
      }),

      // Discovery Analytics
      prisma.discoveryResult.count(), // Businesses Found
      prisma.discoveryResult.count({ where: { validationStatus: 'REJECTED' } }), // Businesses Rejected
      prisma.discoveryResult.count({ where: { rejectionGate: 'Gate1_Duplicate' } }), // Duplicates Removed
      prisma.discoveryResult.count({ where: { rejectionGate: 'Gate0_Blacklist' } }), // Blacklisted Businesses
      prisma.discoveryResult.count({ where: { validationStatus: 'APPROVED' } }), // Qualified Leads
      prisma.discoveryResult.count({ where: { validationStatus: 'APPROVED', opportunityScore: { gte: 90 } } }), // Hot Leads
      
      // Emails
      prisma.activityLog.count({ where: { action: 'EMAIL_SENT' } })
    ]);

    // Calculate Failed Emails from Bulk Campaign Logs
    const failedEmailsLogs = await prisma.activityLog.findMany({
      where: { action: 'BULK_CAMPAIGN_LOG' },
      select: { details: true }
    });
    let failedEmailsCount = 0;
    for (const log of failedEmailsLogs) {
      if (log.details && typeof log.details === 'object' && 'failedCount' in log.details) {
        failedEmailsCount += Number((log.details as any).failedCount) || 0;
      }
    }

    const statusMap = leadsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    sendSuccess(res, {
      totalLeads,
      newLeadsCount: statusMap['NEW'] || 0,
      interestedLeadsCount: statusMap['INTERESTED'] || 0,
      convertedLeadsCount: statusMap['CONVERTED'] || 0,
      emailsSentCount,
      failedEmailsCount,
      hotLeadsCount,
      warmLeadsCount,
      coldLeadsCount,
      leadsByStatus: statusMap,
      recentLeads,
      recentScans,
      discoveryStats: {
        businessesFound,
        businessesRejected,
        duplicatesRemoved,
        blacklistedBusinesses,
        qualifiedLeads,
        hotLeads,
      }
    });
  } catch (err) {
    logger.error('getDashboardStats error', { err });
    sendError(res, 500, 'Failed to fetch dashboard stats');
  }
};
