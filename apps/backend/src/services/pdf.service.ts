import puppeteer from 'puppeteer';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const generateAuditPdf = async (auditId: string): Promise<Buffer> => {
  const audit = await prisma.websiteAudit.findUnique({
    where: { id: auditId },
    include: { lead: true },
  });

  if (!audit) throw new Error('Audit not found');

  const { lead } = audit;
  
  let aiSummaryObj: any = null;
  if (audit.aiSummary) {
    try {
      aiSummaryObj = JSON.parse(audit.aiSummary);
    } catch(e) {}
  }

  // Construct HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Audit Report - ${lead.businessName}</title>
      <style>
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 28px; color: #0f172a; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
        .logo { font-size: 24px; font-weight: 800; color: #f97316; }
        
        .section { margin-bottom: 30px; }
        .section-title { font-size: 18px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
        
        .grid { display: flex; gap: 20px; margin-bottom: 20px; }
        .card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
        .card-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .card-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
        
        .perf-color { color: #f97316; }
        .seo-color { color: #3b82f6; }
        .a11y-color { color: #22c55e; }
        .bp-color { color: #a855f7; }
        
        .screenshot-container { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
        .screenshot { width: 100%; display: block; }
        
        .lists-container { display: flex; gap: 30px; }
        .list-box { flex: 1; }
        .list-box h4 { margin-top: 0; font-size: 14px; text-transform: uppercase; }
        ul { padding-left: 20px; margin: 0; }
        li { margin-bottom: 8px; font-size: 14px; }
        
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Website Audit Report</h1>
          <p>Prepared for: <strong>${lead.businessName}</strong> (${audit.targetUrl})</p>
          <p>Date: ${new Date(audit.createdAt).toLocaleDateString()}</p>
        </div>
        <div class="logo">RSOrangeTech</div>
      </div>

      ${audit.screenshotPath ? `
      <div class="section">
        <div class="screenshot-container">
          <img src="http://localhost:4000${audit.screenshotPath}" alt="Website Screenshot" class="screenshot" />
        </div>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Lighthouse Performance Scores</div>
        <div class="grid">
          <div class="card">
            <div class="card-value perf-color">${audit.performanceScore !== null ? Math.round(audit.performanceScore) : '—'}</div>
            <div class="card-label">Performance</div>
          </div>
          <div class="card">
            <div class="card-value seo-color">${audit.seoScore !== null ? Math.round(audit.seoScore) : '—'}</div>
            <div class="card-label">SEO</div>
          </div>
          <div class="card">
            <div class="card-value a11y-color">${audit.accessibilityScore !== null ? Math.round(audit.accessibilityScore) : '—'}</div>
            <div class="card-label">Accessibility</div>
          </div>
          <div class="card">
            <div class="card-value bp-color">${audit.bestPracticesScore !== null ? Math.round(audit.bestPracticesScore) : '—'}</div>
            <div class="card-label">Best Practices</div>
          </div>
        </div>
      </div>

      ${aiSummaryObj ? `
      <div class="section">
        <div class="section-title">Strategic AI Analysis</div>
        
        <p style="margin-bottom: 20px;"><strong>Redesign Opportunity:</strong> ${aiSummaryObj.redesignOpportunity}</p>
        
        <div class="lists-container">
          <div class="list-box">
            <h4 style="color: #ef4444;">Key Weaknesses</h4>
            <ul>
              ${aiSummaryObj.weaknesses?.map((w: string) => `<li>${w}</li>`).join('')}
            </ul>
          </div>
          <div class="list-box">
            <h4 style="color: #3b82f6;">Recommendations</h4>
            <ul>
              ${aiSummaryObj.recommendations?.map((r: string) => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <div style="margin-top: 30px;">
          <h4 style="color: #64748b; font-size: 14px; text-transform: uppercase;">Suggested RSOrangeTech Services</h4>
          <ul>
             ${aiSummaryObj.suggestedServices?.map((s: string) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Confidential • Prepared by RSOrangeTech • Empowering your digital presence</p>
      </div>
    </body>
    </html>
  `;

  // Launch Puppeteer to generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Set content and wait for images to load
  await page.setContent(html, { waitUntil: 'load' });
  
  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
};
