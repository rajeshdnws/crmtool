import OpenAI from 'openai';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { settingsService } from './settings.service';
export const analyzeAudit = async (auditId: string): Promise<void> => {
  try {
    const audit = await prisma.websiteAudit.findUnique({
      where: { id: auditId },
      include: { lead: true },
    });

    if (!audit || !audit.lead) throw new Error('Audit or Lead not found');

    const apiKey = await settingsService.get('openaiApiKey', config.openai.apiKey);
    const model = await settingsService.get('openaiModel', config.openai.model);

    if (!apiKey) {
      logger.warn(`Skipping AI analysis for audit ${auditId}: OpenAI API Key is missing. Configure it in Settings.`);
      return;
    }

    const openai = new OpenAI({ apiKey });
    const { lead } = audit;

    // Construct the data payload string for the AI
    const websiteData = `
Business Name: ${lead.businessName}
Industry: ${lead.industry || 'Unknown'}
URL: ${audit.targetUrl}
Page Title: ${audit.pageTitle || 'N/A'}
Meta Description: ${audit.metaDescription || 'N/A'}
SSL Enabled: ${audit.hasSsl ? 'Yes' : 'No'}
Mobile Responsive: ${audit.isMobileResponsive ? 'Yes' : 'No'}
Contact Form Detected: ${audit.hasContactForm ? 'Yes' : 'No'}
Detected Technologies: ${Array.isArray(audit.technologies) ? audit.technologies.join(', ') : 'None'}
Social Links: ${audit.socialLinks ? Object.keys(audit.socialLinks).join(', ') : 'None'}

Lighthouse Scores:
- Performance: ${audit.performanceScore || 'N/A'}/100
- SEO: ${audit.seoScore || 'N/A'}/100
- Accessibility: ${audit.accessibilityScore || 'N/A'}/100
- Best Practices: ${audit.bestPracticesScore || 'N/A'}/100
    `.trim();

    // Call OpenAI with Structured Outputs
    const response = await openai.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical web consultant and digital marketing strategist for RSOrangeTech. Analyze the provided website data and Lighthouse scores. Provide a highly actionable assessment of their current online presence, and suggest exactly what services RSOrangeTech should pitch to them.',
        },
        {
          role: 'user',
          content: websiteData,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'website_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              weaknesses: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of specific weaknesses found in the website (e.g. Slow performance, missing SSL, poor SEO).',
              },
              recommendations: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of prioritized improvement recommendations.',
              },
              redesignOpportunity: {
                type: 'string',
                enum: ['HIGH', 'MEDIUM', 'LOW'],
                description: 'Estimated opportunity level for a full website redesign.',
              },
              suggestedServices: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of specific services RSOrangeTech should pitch to them (e.g. SEO Optimization, Web Development, Accessibility Remediation).',
              },
            },
            required: ['weaknesses', 'recommendations', 'redesignOpportunity', 'suggestedServices'],
            additionalProperties: false,
          },
        },
      },
    });

    const aiOutputString = response.choices[0]?.message?.content;
    
    if (!aiOutputString) {
      throw new Error('No content returned from OpenAI');
    }

    // Save structured JSON string to the audit record
    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: {
        aiSummary: aiOutputString,
      },
    });

    // Compute deterministic lead score
    const { calculateLeadScore } = require('./scoring.service');
    const score = await calculateLeadScore(auditId);

    logger.info(`AI analysis completed successfully for audit ${auditId}. Final score: ${score}`);

  } catch (error) {
    logger.error(`AI analysis failed for audit ${auditId}`, { error });
  }
};
