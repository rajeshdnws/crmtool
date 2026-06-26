import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendError } from '../../utils/response';
import { logger } from '../../config/logger';
import { LeadStatus } from '@prisma/client';
import { sendOutreachEmail as sendEmailService } from '../../services/email.service';

// GET /api/leads
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = String(req.query.page   ?? '1');
    const limit  = String(req.query.limit  ?? '20');
    const status = req.query.status  ? String(req.query.status)  : undefined;
    const search = req.query.search  ? String(req.query.search)  : undefined;
    const businessName = req.query.businessName ? String(req.query.businessName) : undefined;
    const emailFilter = req.query.email ? String(req.query.email) : undefined;
    const location = req.query.location ? String(req.query.location) : undefined;
    const dateFrom = req.query.dateFrom ? String(req.query.dateFrom) : undefined;
    const dateTo = req.query.dateTo ? String(req.query.dateTo) : undefined;
    
    // Contact Enrichments Filters
    const hasWebsite = req.query.hasWebsite === 'true';
    const hasEmail = req.query.hasEmail === 'true';
    const hasPhone = req.query.hasPhone === 'true';
    const hasWhatsapp = req.query.hasWhatsapp === 'true';
    const emailSent = req.query.emailSent === 'true';

    const sortBy = req.query.sortBy  ? String(req.query.sortBy)  : 'createdAt';
    const sortOrder = req.query.sortOrder ? String(req.query.sortOrder) : 'desc';

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      isDeleted: false,
      ...(status && { status: status as LeadStatus }),
      ...(businessName && { businessName: { contains: businessName } }),
      ...(emailFilter && { email: { contains: emailFilter } }),
      ...(hasWebsite && { website: { not: null } }),
      ...(hasPhone && { phone: { not: null } }),
      ...(hasWhatsapp && { whatsappLink: { not: null } }),
    };

    const andConditions: any[] = [];

    if (emailSent) {
      andConditions.push({
        OR: [
          { emailSent: true },
          { status: 'EMAIL_SENT' }
        ]
      });
    }

    if (hasEmail) {
      andConditions.push({
        OR: [
          { emailFound: true },
          { email: { not: null } },
          { email: { not: '' } }
        ]
      });
    }

    if (location) {
      andConditions.push({
        OR: [
          { city: { contains: location } },
          { state: { contains: location } },
          { country: { contains: location } },
        ]
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { businessName: { contains: search } },
          { website: { contains: search } },
          { email: { contains: search } },
          { city: { contains: search } },
          { state: { contains: search } },
          { country: { contains: search } },
          { industry: { contains: search } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const validSortFields = ['businessName', 'createdAt', 'updatedAt', 'leadScore', 'contactScore', 'status'];
    const orderBy = validSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' }
      : { createdAt: 'desc' as const };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          _count: { select: { websiteAudits: true } },
          websiteAudits: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              performanceScore: true,
              seoScore: true,
              accessibilityScore: true,
              bestPracticesScore: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    sendSuccess(res, leads, 200, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    logger.error('getLeads error', { err });
    sendError(res, 500, 'Failed to fetch leads');
  }
};

// GET /api/leads/:id
export const getLeadById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
      include: {
        websiteAudits: { 
          orderBy: { createdAt: 'desc' },
          include: { issues: true }
        },
        reports: { orderBy: { generatedAt: 'desc' } },
        activityLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    sendSuccess(res, lead);
  } catch (err) {
    logger.error('getLeadById error', { err });
    sendError(res, 500, 'Failed to fetch lead');
  }
};

// POST /api/leads
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { businessName, website, email, phone, city, state, country, industry, notes } =
      req.body as {
        businessName: string;
        website: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
        country?: string;
        industry?: string;
        notes?: string;
      };

    if (!businessName || !website) {
      sendError(res, 400, 'Business name and website are required');
      return;
    }

    const existing = await prisma.lead.findUnique({ where: { website } });
    if (existing) {
      sendError(res, 409, 'A lead with this website already exists');
      return;
    }

    const lead = await prisma.lead.create({
      data: { businessName, website, email, phone, city, state, country, industry, notes },
    });

    await prisma.activityLog.create({
      data: { leadId: lead.id, action: 'LEAD_CREATED' },
    });

    logger.info(`Lead created: ${lead.businessName} (${lead.id})`);
    sendSuccess(res, lead, 201);
  } catch (err) {
    logger.error('createLead error', { err });
    sendError(res, 500, 'Failed to create lead');
  }
};

// PUT /api/leads/:id
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    const {
      businessName, website, email, phone,
      city, state, country, industry, notes, status, leadScore, emailSent,
    } = req.body as Partial<{
      businessName: string; website: string; email: string; phone: string;
      city: string; state: string; country: string; industry: string; 
      notes: string; status: LeadStatus; leadScore: number; emailSent: boolean;
    }>;

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(website !== undefined && { website }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(industry !== undefined && { industry }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(leadScore !== undefined && { leadScore }),
        ...(emailSent !== undefined && { emailSent: Boolean(emailSent) }),
        ...(emailSent === true && existing.status === 'NEW' && status === undefined && { status: 'EMAIL_SENT' }),
      },
    });

    if (status !== undefined && status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          leadId: lead.id,
          action: 'STATUS_UPDATED',
          details: { oldStatus: existing.status, newStatus: status },
        },
      });
    }

    sendSuccess(res, lead);
  } catch (err) {
    logger.error('updateLead error', { err });
    sendError(res, 500, 'Failed to update lead');
  }
};

// DELETE /api/leads/:id (soft delete)
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const existing = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    await prisma.lead.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.status(204).send();
  } catch (err) {
    logger.error('deleteLead error', { err });
    sendError(res, 500, 'Failed to delete lead');
  }
};

// POST /api/leads/bulk
export const bulkCreateLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = req.body as Partial<Record<string, any>>[];

    if (!Array.isArray(leads) || leads.length === 0) {
      sendError(res, 400, 'Expected an array of leads');
      return;
    }

    let invalidCount = 0;
    let duplicateCount = 0;
    const invalidDetails: string[] = [];
    
    const validLeads: any[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Check for duplicates within payload
    const payloadEmails = new Set<string>();
    const payloadPhones = new Set<string>();
    const payloadWebsites = new Set<string>();

    for (let i = 0; i < leads.length; i++) {
      const l = leads[i];
      if (!l.businessName) {
        invalidCount++;
        invalidDetails.push(`Row ${i + 1}: Missing Business Name`);
        continue;
      }
      
      const emailStr = l.email ? String(l.email).trim() : null;
      if (emailStr && !emailRegex.test(emailStr)) {
        invalidCount++;
        invalidDetails.push(`Row ${i + 1}: Invalid email format (${emailStr})`);
        continue;
      }

      const phoneStr = l.phone ? String(l.phone).trim() : null;
      const websiteStr = l.website ? String(l.website).trim() : null;
      
      // Duplicate detection within the payload
      let isDuplicateInPayload = false;
      if (emailStr) {
        if (payloadEmails.has(emailStr)) isDuplicateInPayload = true;
        payloadEmails.add(emailStr);
      }
      if (phoneStr) {
        if (payloadPhones.has(phoneStr)) isDuplicateInPayload = true;
        payloadPhones.add(phoneStr);
      }
      if (websiteStr) {
        if (payloadWebsites.has(websiteStr)) isDuplicateInPayload = true;
        payloadWebsites.add(websiteStr);
      }

      if (isDuplicateInPayload) {
        duplicateCount++;
        continue;
      }

      validLeads.push({
        businessName: String(l.businessName),
        website: websiteStr,
        contactPerson: l.contactPerson ? String(l.contactPerson) : null,
        email: emailStr,
        phone: phoneStr,
        city: l.city ? String(l.city) : null,
        state: l.state ? String(l.state) : null,
        country: l.country ? String(l.country) : null,
        industry: l.industry ? String(l.industry) : null,
        notes: l.notes ? String(l.notes) : null,
      });
    }

    if (validLeads.length === 0) {
      sendSuccess(res, { totalRecords: leads.length, imported: 0, duplicates: duplicateCount, invalid: invalidCount, invalidDetails }, 201);
      return;
    }

    // Check against DB for existing unique constraints or duplicates (email, phone, website)
    const existingLeads = await prisma.lead.findMany({
      where: {
        OR: [
          { website: { in: validLeads.map(l => l.website).filter(Boolean) as string[] } },
          { email: { in: validLeads.map(l => l.email).filter(Boolean) as string[] } },
          { phone: { in: validLeads.map(l => l.phone).filter(Boolean) as string[] } }
        ],
        isDeleted: false
      },
      select: { website: true, email: true, phone: true }
    });

    const existingWebsites = new Set(existingLeads.map(l => l.website).filter(Boolean));
    const existingEmails = new Set(existingLeads.map(l => l.email).filter(Boolean));
    const existingPhones = new Set(existingLeads.map(l => l.phone).filter(Boolean));

    const readyToInsert = [];
    for (const l of validLeads) {
      const hasDuplicateDb = 
        (l.website && existingWebsites.has(l.website)) ||
        (l.email && existingEmails.has(l.email)) ||
        (l.phone && existingPhones.has(l.phone));
        
      if (hasDuplicateDb) {
        duplicateCount++;
      } else {
        readyToInsert.push(l);
      }
    }

    if (readyToInsert.length > 0) {
      await prisma.lead.createMany({
        data: readyToInsert,
        skipDuplicates: true,
      });

      const importedLeads = await prisma.lead.findMany({
        where: { website: { in: readyToInsert.map(l => l.website).filter(Boolean) as string[] } },
        select: { id: true },
      });

      if (importedLeads.length > 0) {
        await prisma.activityLog.createMany({
          data: importedLeads.map(l => ({ leadId: l.id, action: 'LEAD_CREATED' })),
        });
      }
    }
    
    logger.info(`Bulk import: ${readyToInsert.length} created, ${duplicateCount} duplicates, ${invalidCount} invalid.`);
    
    sendSuccess(res, { 
      totalRecords: leads.length, 
      imported: readyToInsert.length, 
      duplicates: duplicateCount, 
      invalid: invalidCount,
      invalidDetails 
    }, 201);
  } catch (err) {
    logger.error('bulkCreateLeads error', { err });
    sendError(res, 500, 'Failed to bulk import leads');
  }
};

// DELETE /api/leads/bulk
export const bulkDeleteLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      sendError(res, 400, 'Expected an array of lead IDs');
      return;
    }

    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });

    logger.info(`Bulk deleted ${result.count} leads.`);
    sendSuccess(res, { deleted: result.count });
  } catch (err) {
    logger.error('bulkDeleteLeads error', { err });
    sendError(res, 500, 'Failed to bulk delete leads');
  }
};

// POST /api/leads/:id/outreach
export const sendOutreachEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const id: string = String(req.params.id);
    const { subject, body } = req.body;

    if (!subject || !body) {
      sendError(res, 400, 'Subject and body are required');
      return;
    }

    const lead = await prisma.lead.findFirst({
      where: { id, isDeleted: false },
    });

    if (!lead) {
      sendError(res, 404, 'Lead not found');
      return;
    }

    if (!lead.email) {
      sendError(res, 400, 'Lead has no email address');
      return;
    }

    await sendEmailService(lead.email, subject, body);

    await prisma.lead.update({
      where: { id },
      data: {
        emailSent: true,
        ...(lead.status === 'NEW' ? { status: 'EMAIL_SENT' } : {}),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        action: 'EMAIL_SENT',
        details: { subject },
      },
    });

    sendSuccess(res, { message: 'Outreach email sent successfully' });
  } catch (err) {
    logger.error('sendOutreachEmail error', { err });
    sendError(res, 500, 'Failed to send outreach email');
  }
};

// POST /api/leads/bulk/outreach
export const bulkSendOutreachEmailController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, subject, body } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !subject || !body) {
      sendError(res, 400, 'ids array, subject, and body are required');
      return;
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, isDeleted: false },
    });

    let sentCount = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      if (!lead.email) {
        errors.push(`Lead ${lead.id} (${lead.businessName}) has no email.`);
        continue;
      }
      
      try {
        const locationStr = [lead.city, lead.state, lead.country].filter(Boolean).join(', ') || 'your location';
        const contactStr = lead.contactPerson || 'there';
        const bizStr = lead.businessName || '';
        const emailStr = lead.email || '';

        const replaceVars = (str: string) => {
          return str
            .replace(/{Name}/gi, contactStr)
            .replace(/{Business}/gi, bizStr)
            .replace(/{{businessName}}/g, bizStr)
            .replace(/{{contactPerson}}/g, contactStr)
            .replace(/{{email}}/g, emailStr)
            .replace(/{{industry}}/g, lead.industry || 'your')
            .replace(/{{location}}/g, locationStr);
        };

        const personalizedBody = replaceVars(body);
        const personalizedSubject = replaceVars(subject);

        await sendEmailService(lead.email, personalizedSubject, personalizedBody);
        
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            emailSent: true,
            ...(lead.status === 'NEW' ? { status: 'EMAIL_SENT' } : {}),
          },
        });
        sentCount++;
      } catch (err: any) {
        errors.push(`Failed to send to ${lead.email}: ${err.message}`);
      }
    }

    sendSuccess(res, { sent: sentCount, total: leads.length, errors });
  } catch (err) {
    logger.error('bulkSendOutreachEmail error', { err });
    sendError(res, 500, 'Failed to send bulk outreach emails');
  }
};

// POST /api/leads/bulk/log
export const logBulkCampaignController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sent, failed, skipped, templateName } = req.body;

    await prisma.activityLog.create({
      data: {
        action: 'BULK_EMAIL_CAMPAIGN',
        details: { sent, failed, skipped, templateName },
      },
    });

    sendSuccess(res, { message: 'Campaign logged successfully' });
  } catch (err) {
    logger.error('logBulkCampaign error', { err });
    sendError(res, 500, 'Failed to log bulk campaign');
  }
};

// POST /api/leads/extension-sync
export const bulkSyncFromExtension = async (req: Request, res: Response): Promise<void> => {
  try {
    const leads = req.body.leads || req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      sendError(res, 400, 'Expected an array of leads');
      return;
    }

    let insertedCount = 0;
    let skippedCount = 0;

    // Fetch existing websites/placeIds to avoid duplicate key errors
    const validWebsites = leads.map(l => l.website).filter(Boolean) as string[];
    const validPlaceIds = leads.map(l => l.mapUrl).filter(Boolean) as string[];

    const existingRows = await prisma.lead.findMany({
      where: {
        OR: [
          { website: { in: validWebsites } },
          { placeId: { in: validPlaceIds } }
        ]
      },
      select: { website: true, placeId: true }
    });

    const existWebs = new Set(existingRows.map(r => r.website).filter(Boolean));
    const existPlaces = new Set(existingRows.map(r => r.placeId).filter(Boolean));

    const toInsert: any[] = [];

    for (const l of leads) {
      if (!l.name) continue;
      const web = l.website?.trim() || null;
      const place = l.mapUrl?.trim() || null;

      if ((web && existWebs.has(web)) || (place && existPlaces.has(place))) {
        skippedCount++;
        continue;
      }

      if (web) existWebs.add(web);
      if (place) existPlaces.add(place);

      const emailStr = l.emails && l.emails.length > 0 ? l.emails[0] : null;
      const waNumber = l.whatsappNumbers && l.whatsappNumbers.length > 0 ? l.whatsappNumbers[0] : null;
      
      const richNotes = [
        `**Source:** Chrome AI Scraper`,
        `**Opportunity Level:** ${l.opportunityLevel || 'N/A'} (+${l.audit?.opportunityScore ?? 0} pts)`,
        `**Website Quality:** ${l.websiteScore ?? 'N/A'}/100 (SEO: ${l.seoScore ?? '—'}, Mobile: ${l.mobileScore ?? '—'}, Speed: ${l.speedScore ?? '—'})`,
        `**Tech Stack:** ${l.detectedTechnology || 'Unknown'}`,
        `**Chatbot Status:** ${l.chatbotDetected ? `Detected (${l.chatbotType})` : 'Missing Chatbot (+15 pts)'}`,
        l.websiteIssues && l.websiteIssues.length > 0 ? `\n**Detected Issues:**\n- ${l.websiteIssues.join('\n- ')}` : '',
        l.aiRecommendations && l.aiRecommendations.length > 0 ? `\n**AI Recommendations:**\n- ${l.aiRecommendations.join('\n- ')}` : ''
      ].filter(Boolean).join('\n');

      toInsert.push({
        businessName: String(l.name),
        website: web,
        placeId: place,
        email: emailStr,
        phone: l.phone?.trim() || null,
        industry: l.category?.trim() || null,
        rating: l.rating ? parseFloat(l.rating) : null,
        reviews: l.reviews ? parseInt(l.reviews) : null,
        source: "CHROME_EXTENSION",
        whatsappNumber: waNumber,
        socialLinks: l.socialLinks ? (l.socialLinks as any) : null,
        emailFound: !!emailStr,
        notes: richNotes,
        opportunityScore: l.audit?.opportunityScore ?? null,
        websiteScore: l.websiteScore ?? null,
        seoScore: l.seoScore ?? null,
        mobileScore: l.mobileScore ?? null,
        speedScore: l.speedScore ?? null,
        designScore: l.designScore ?? null,
        conversionScore: l.conversionScore ?? null,
        technology: l.detectedTechnology ?? null,
        chatbotDetected: l.chatbotDetected ?? false,
        chatbotType: l.chatbotType ?? null,
        opportunityLevel: l.opportunityLevel ?? null
      });
    }

    if (toInsert.length > 0) {
      await prisma.lead.createMany({
        data: toInsert,
        skipDuplicates: true
      });
      insertedCount = toInsert.length;
    }

    logger.info(`Extension Sync: ${insertedCount} inserted, ${skippedCount} skipped.`);
    sendSuccess(res, { success: true, inserted: insertedCount, skipped: skippedCount });
  } catch (err: any) {
    logger.error('bulkSyncFromExtension error', { err });
    sendError(res, 500, 'Failed to sync leads from Chrome extension');
  }
};
