import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { settingsService } from './settings.service';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<void> => {
  const provider = await settingsService.get('emailProvider', 'smtp');
  const fromName = await settingsService.get('emailFromName', 'RSOrangeTech Sales');
  const fromAddress = await settingsService.get('emailFromAddress', config.smtp.from || 'sales@rsorangetech.com');
  const from = `"${fromName}" <${fromAddress}>`;

  if (provider === 'resend') {
    const apiKey = await settingsService.get('resendApiKey', '');
    if (!apiKey) throw new Error('Resend API key not configured');
    const resend = new Resend(apiKey);
    await resend.emails.send({ from, to, subject, html });
    return;
  }

  if (provider === 'sendgrid') {
    const apiKey = await settingsService.get('sendgridApiKey', '');
    if (!apiKey) throw new Error('SendGrid API key not configured');
    sgMail.setApiKey(apiKey);
    await sgMail.send({ from, to, subject, html });
    return;
  }

  if (provider === 'ses') {
    const accessKeyId = await settingsService.get('awsAccessKeyId', '');
    const secretAccessKey = await settingsService.get('awsSecretAccessKey', '');
    const region = await settingsService.get('awsRegion', 'us-east-1');
    if (!accessKeyId || !secretAccessKey) throw new Error('AWS SES credentials not configured');

    const client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });

    await client.send(new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } }
      }
    }));
    return;
  }

  // fallback/default to 'smtp'
  const host = await settingsService.get('smtpHost', config.smtp.host);
  const port = parseInt(await settingsService.get('smtpPort', String(config.smtp.port || 587)), 10);
  const user = await settingsService.get('smtpUser', config.smtp.user);
  const pass = await settingsService.get('smtpPass', config.smtp.pass);

  if (!host) {
    logger.warn('No email provider host configured. Skipping real email delivery.');
    logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: host || 'smtp.ethereal.email',
    port,
    secure: port === 465,
    auth: {
      user: user || 'test',
      pass: pass || 'test',
    },
  });

  await transporter.sendMail({ from, to, subject, html });
};

export interface DailySummaryData {
  newLeadsCount: number;
  hotLeadsCount: number;
  scannedCount: number;
  topOpportunities: Array<{
    id: string;
    businessName: string;
    website: string;
    leadScore: number | null;
  }>;
}

export const sendDailySummaryEmail = async (data: DailySummaryData): Promise<void> => {
  const toEmail = await settingsService.get('smtpToSales', config.smtp.toSales || 'sales@rsorangetech.com');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: #f97316; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px 20px; }
        .stats-grid { display: flex; gap: 15px; margin-bottom: 30px; }
        .stat-box { flex: 1; background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; color: #f97316; margin-bottom: 5px; }
        .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .hot-color { color: #ef4444; }
        .opps-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        .opps-table th, .opps-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .opps-table th { font-size: 12px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
        .score-badge { background: #fef2f2; color: #ef4444; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; }
        .btn { display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>RSOrangeTech Daily Digest</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Your daily lead pipeline summary</p>
        </div>
        
        <div class="content">
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-value">${data.newLeadsCount}</div>
              <div class="stat-label">New Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-value hot-color">${data.hotLeadsCount}</div>
              <div class="stat-label">Hot Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${data.scannedCount}</div>
              <div class="stat-label">Scans Completed</div>
            </div>
          </div>

          <h2 style="font-size: 18px; margin-bottom: 10px;">🔥 Top Opportunities (Last 24h)</h2>
          <p style="font-size: 14px; color: #64748b; margin-top: 0;">These leads have the highest scores and critically need our services.</p>
          
          <table class="opps-table">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${data.topOpportunities.length > 0 ? data.topOpportunities.map(opp => `
                <tr>
                  <td style="font-weight: 600; font-size: 14px;">${opp.businessName}</td>
                  <td><span class="score-badge">${opp.leadScore}</span></td>
                  <td><a href="http://localhost:3000/leads/${opp.id}" class="btn">View Lead</a></td>
                </tr>
              `).join('') : `
                <tr><td colspan="3" style="text-align: center; color: #94a3b8; font-size: 14px;">No hot leads generated today.</td></tr>
              `}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>Automated by RS Orange Tech CRM</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: toEmail,
      subject: `🔥 Daily Lead Summary - ${data.hotLeadsCount} Hot Leads`,
      html: htmlContent,
    });

    logger.info(`Daily summary email sent successfully`);
  } catch (error) {
    logger.error('Failed to send daily summary email', { error });
  }
};

export const sendOutreachEmail = async (to: string, subject: string, body: string): Promise<void> => {
  try {
    // If the body is plain text, convert newlines to HTML breaks and paragraphs
    const isHtml = /<(?:html|body|div|p|br|strong|b|i|em|span|table|ul|li|h[1-6])\b/i.test(body);
    let htmlContent = body;

    if (!isHtml) {
      htmlContent = body
        .split(/\r?\n\r?\n/)
        .map(paragraph => `<p style="margin-bottom: 16px;">${paragraph.replace(/\r?\n/g, '<br>')}</p>`)
        .join('');
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Premium Email Template Styles */
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b; 
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .email-wrapper {
            background-color: #f1f5f9;
            padding: 40px 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
            border: 1px solid #e2e8f0;
          }
          .header {
            padding: 40px 40px 30px;
            text-align: center;
            border-bottom: 1px solid #f1f5f9;
            background: #ffffff;
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #f97316 0%, #fb923c 100%);
          }
          .logo {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
          }
          .logo-icon {
            width: 32px;
            height: 32px;
            background: #f97316;
            border-radius: 8px;
            display: inline-block;
            vertical-align: middle;
            position: relative;
          }
          .logo-text {
            color: #0f172a;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.03em;
            vertical-align: middle;
            margin: 0;
            display: inline-block;
          }
          .logo-text span {
            color: #f97316;
          }
          .content {
            padding: 40px;
            font-size: 16px;
            color: #334155;
          }
          .content p {
            margin-bottom: 20px;
          }
          .content a {
            color: #f97316;
            text-decoration: none;
            font-weight: 500;
          }
          .footer {
            background-color: #0f172a;
            padding: 40px;
            text-align: center;
            color: #94a3b8;
          }
          .footer-logo {
            font-weight: 700;
            color: #ffffff;
            font-size: 18px;
            letter-spacing: -0.02em;
            margin-bottom: 16px;
          }
          .footer p {
            margin: 0 0 8px 0;
            font-size: 13px;
          }
          .footer-links {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid #1e293b;
          }
          .footer-links a {
            color: #cbd5e1;
            text-decoration: none;
            font-size: 12px;
            margin: 0 12px;
            transition: color 0.2s ease;
          }
          .footer-links a:hover {
            color: #f97316;
          }
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 20px 10px; }
            .header { padding: 30px 20px 20px; }
            .content { padding: 30px 20px; }
            .footer { padding: 30px 20px; }
          }
        </style>
        <!-- Import Inter font for better typography -->
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <div class="header">
              <a href="https://rsorangetech.com" class="logo">
                <div class="logo-icon">
                  <!-- Minimalist abstract geometric mark representing 'RS' and technology -->
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 8L22 16L10 24V8Z" fill="white" />
                  </svg>
                </div>
                <h1 class="logo-text">RS<span>Orange</span>Tech</h1>
              </a>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
            <div class="footer">
              <div class="footer-logo">RS Orange Tech</div>
              <p>Innovative Custom Software, Web Development & AI Solutions</p>
              <p>120 Harsh Vihar Noida Extension GB nagar 201009</p>
              <div class="footer-links">
                <a href="https://rsorangetech.com">Website</a>
                <a href="https://rsorangetech.com/privacy-policy">Privacy Policy</a>
                <a href="#">Unsubscribe</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject,
      html: fullHtml,
    });

    logger.info(`Outreach email sent successfully to ${to}`);
  } catch (error) {
    logger.error(`Failed to send outreach email to ${to}`, { error });
    throw error;
  }
};
