import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';

// GET /api/audits — all website audits, filterable by leadId
export const getAudits = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = req.query.leadId ? String(req.query.leadId) : undefined;
    const page   = String(req.query.page   ?? '1');
    const limit  = String(req.query.limit  ?? '20');

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where = leadId ? { leadId } : {};

    const [audits, total] = await Promise.all([
      prisma.websiteAudit.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: {
            select: { id: true, businessName: true, website: true },
          },
          issues: true,
        },
      }),
      prisma.websiteAudit.count({ where }),
    ]);

    sendSuccess(res, audits, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    logger.error('getAudits error', { err });
    sendError(res, 500, 'Failed to fetch audits');
  }
};

// GET /api/audits/:id
export const getAuditById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const audit = await prisma.websiteAudit.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, businessName: true, website: true } },
        issues: true,
      },
    });

    if (!audit) {
      sendError(res, 404, 'Audit not found');
      return;
    }

    sendSuccess(res, audit);
  } catch (err) {
    logger.error('getAuditById error', { err });
    sendError(res, 500, 'Failed to fetch audit');
  }
};

// POST /api/audits — manually create a website audit
export const createAudit = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      leadId, targetUrl, performanceScore, seoScore,
      accessibilityScore, bestPracticesScore, aiSummary, rawJson,
    } = req.body as {
      leadId: string;
      targetUrl?: string;
      performanceScore?: number;
      seoScore?: number;
      accessibilityScore?: number;
      bestPracticesScore?: number;
      aiSummary?: string;
      rawJson?: object;
    };

    if (!leadId) {
      sendError(res, 400, 'leadId is required');
      return;
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    const urlToCrawl = targetUrl || lead.website;
    
    if (!urlToCrawl) {
      sendError(res, 400, 'Target URL or Lead Website is required to create an audit');
      return;
    }

    const audit = await prisma.websiteAudit.create({
      data: {
        leadId, 
        targetUrl: urlToCrawl,
        status: 'DONE', // Manual creation assumes done for now
        performanceScore, 
        seoScore,
        accessibilityScore, 
        bestPracticesScore,
        aiSummary, 
        rawJson,
      },
    });

    logger.info(`Audit created for lead: ${lead.businessName}`);
    sendSuccess(res, audit, 201);
  } catch (err) {
    logger.error('createAudit error', { err });
    sendError(res, 500, 'Failed to create audit');
  }
};

// POST /api/audits/scan/:leadId
import { runScanner } from '../../services/scanner.service';

export const triggerScan = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = String(req.params.leadId);
    
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    if (!lead.website) {
      sendError(res, 400, 'Cannot run scanner: Lead does not have a website');
      return;
    }

    const audit = await prisma.websiteAudit.create({
      data: {
        leadId,
        targetUrl: lead.website,
        status: 'PENDING',
      },
    });

    // Run scanner asynchronously without blocking the response
    runScanner(audit.id, lead.website).catch((err) => {
      logger.error('Background scanner failed completely', { err });
    });

    sendSuccess(res, audit, 202, { message: 'Scanner started' });
  } catch (err) {
    logger.error('triggerScan error', { err });
    sendError(res, 500, 'Failed to trigger scanner');
  }
};

export const downloadPdfReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if audit exists and is DONE
    const audit = await prisma.websiteAudit.findUnique({
      where: { id },
      include: { lead: true }
    });

    if (!audit) {
      sendError(res, 404, 'Audit not found');
      return;
    }

    if (audit.status !== 'DONE') {
      sendError(res, 400, 'Audit is not complete yet. Please wait for the scan to finish.');
      return;
    }

    const { generateAuditPdf } = require('../../services/pdf.service');
    const pdfBuffer = await generateAuditPdf(id);

    const filename = `RSOrangeTech-Audit-${audit.lead.businessName.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    logger.error('downloadPdfReport error', { err });
    sendError(res, 500, 'Failed to generate PDF report');
  }
};
