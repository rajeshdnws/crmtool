import nodemailer from 'nodemailer';
import { sendDailySummaryEmail, DailySummaryData } from './src/services/email.service';
import { config } from './src/config/env';

async function testEmail() {
  console.log('Generating Ethereal test account...');
  const testAccount = await nodemailer.createTestAccount();
  
  console.log('Test account created:');
  console.log('User:', testAccount.user);
  console.log('Pass:', testAccount.pass);

  // Override config to use the test account
  (config.smtp as any).host = 'smtp.ethereal.email';
  (config.smtp as any).port = 587;
  (config.smtp as any).user = testAccount.user;
  (config.smtp as any).pass = testAccount.pass;
  (config.smtp as any).from = '"Test RSOrangeTech" <test@rsorangetech.com>';
  (config.smtp as any).toSales = 'sales@rsorangetech.com';

  const dummyData: DailySummaryData = {
    newLeadsCount: 15,
    hotLeadsCount: 3,
    scannedCount: 42,
    topOpportunities: [
      { id: '1', businessName: 'Acme Corp', website: 'https://acme.com', leadScore: 95 },
      { id: '2', businessName: 'Global Tech', website: 'https://globaltech.com', leadScore: 88 },
      { id: '3', businessName: 'Local Bakery', website: 'https://localbakery.com', leadScore: 82 },
    ]
  };

  console.log('Sending test daily summary email...');
  
  // Create transporter locally to get the message URL
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

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
              <div class="stat-value">${dummyData.newLeadsCount}</div>
              <div class="stat-label">New Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-value hot-color">${dummyData.hotLeadsCount}</div>
              <div class="stat-label">Hot Leads</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${dummyData.scannedCount}</div>
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
              ${dummyData.topOpportunities.map(opp => `
                <tr>
                  <td style="font-weight: 600; font-size: 14px;">${opp.businessName}</td>
                  <td><span class="score-badge">${opp.leadScore}</span></td>
                  <td><a href="http://localhost:3000/leads/${opp.id}" class="btn">View Lead</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>Automated by RSOrangeTech CRM</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let info = await transporter.sendMail({
    from: '"RSOrangeTech CRM" <no-reply@rsorangetech.com>',
    to: 'sales@rsorangetech.com',
    subject: `🔥 Daily Lead Summary - ${dummyData.hotLeadsCount} Hot Leads`,
    html: htmlContent,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  console.log('\\n👉 CLICK THE PREVIEW URL ABOVE TO SEE THE RENDERED EMAIL HTML!');
}

testEmail().catch(console.error);
