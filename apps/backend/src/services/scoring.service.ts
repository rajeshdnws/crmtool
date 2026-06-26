import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const calculateLeadScore = async (auditId: string) => {
  logger.info(`Calculating deterministic lead score for audit ${auditId}`);

  try {
    const audit = await prisma.websiteAudit.findUnique({
      where: { id: auditId },
      include: { lead: true },
    });

    if (!audit) throw new Error('Audit not found');

    let score = 0;

    // 1. No SSL
    if (audit.hasSsl === false) {
      score += 10;
    }

    // 2. Poor SEO (Lighthouse score < 60 or missing)
    if (audit.seoScore === null || audit.seoScore < 60) {
      score += 15;
    }

    // 3. Slow Performance (Lighthouse score < 50 or missing)
    if (audit.performanceScore === null || audit.performanceScore < 50) {
      score += 20;
    }

    // 4. Non Mobile Friendly
    if (audit.isMobileResponsive === false) {
      score += 20;
    }

    // 5. Missing Contact Form
    if (audit.hasContactForm === false) {
      score += 10;
    }

    // 6. Outdated Design (via AI analysis redesignOpportunity)
    if (audit.aiSummary) {
      try {
        const aiAnalysis = JSON.parse(audit.aiSummary);
        if (aiAnalysis.redesignOpportunity === 'HIGH') {
          score += 25;
        }
      } catch (e) {
        logger.error(`Failed to parse AI summary for audit ${auditId}`, { error: e });
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    // Update Lead Score
    await prisma.lead.update({
      where: { id: audit.leadId },
      data: { leadScore: score },
    });

    logger.info(`Lead score calculated: ${score} for lead ${audit.leadId}`);
    return score;

  } catch (error) {
    logger.error(`Failed to calculate lead score for audit ${auditId}`, { error });
  }
};
