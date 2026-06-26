import puppeteer, { Browser } from 'puppeteer';
import * as chromeLauncher from 'chrome-launcher';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs/promises';

// We import lighthouse using dynamic import or require to bypass TS issues if types are missing
const lighthouse = require('lighthouse');

export const runScanner = async (auditId: string, url: string) => {
  logger.info(`Starting scanner for audit ${auditId} on ${url}`);

  let chrome: chromeLauncher.LaunchedChrome | null = null;
  let browser: Browser | null = null;

  try {
    // Update status to RUNNING
    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    // 1. Launch Chrome via chrome-launcher
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox']
    });

    // 2. Run Lighthouse Audit
    logger.info(`Running Lighthouse on ${url}`);
    const lhOptions = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    };

    const lhResult = await lighthouse(url, lhOptions);
    const lhr = lhResult.lhr;

    const performanceScore = lhr.categories.performance?.score ? lhr.categories.performance.score * 100 : null;
    const accessibilityScore = lhr.categories.accessibility?.score ? lhr.categories.accessibility.score * 100 : null;
    const bestPracticesScore = lhr.categories['best-practices']?.score ? lhr.categories['best-practices'].score * 100 : null;
    const seoScore = lhr.categories.seo?.score ? lhr.categories.seo.score * 100 : null;

    logger.info(`Lighthouse scores: Perf=${performanceScore}, A11y=${accessibilityScore}, BP=${bestPracticesScore}, SEO=${seoScore}`);

    // 3. Connect Puppeteer to the same Chrome instance
    const browserURL = `http://localhost:${chrome.port}`;
    browser = await puppeteer.connect({ browserURL });
    const page = await browser.newPage();
    
    // Check SSL simply by url scheme
    const hasSsl = url.startsWith('https');

    // Emulate a standard desktop
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate and wait for network idle (puppeteer pass)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const pageTitle = await page.title();

    // Extract meta description
    const metaDescription = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]');
      return meta ? meta.getAttribute('content') : null;
    });

    // Extract contact form
    const hasContactForm = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const hasKeywords = forms.some(f => {
        const str = (f.className + f.id + f.action).toLowerCase();
        return str.includes('contact') || str.includes('mail') || str.includes('inquiry');
      });
      const hasMailto = !!document.querySelector('a[href^="mailto:"]');
      return forms.length > 0 && (hasKeywords || hasMailto);
    });

    // Extract social links
    const socialLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const socials: Record<string, string> = {};
      const networks = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
      
      links.forEach(link => {
        const href = (link as HTMLAnchorElement).href;
        networks.forEach(network => {
          if (href.includes(network)) {
            const key = network.replace('.com', '');
            if (!socials[key]) socials[key] = href;
          }
        });
      });
      return socials;
    });

    // Technologies
    const technologies = await page.evaluate(() => {
      const tech = [];
      if (document.querySelector('#__next')) tech.push('Next.js');
      if (document.querySelector('#___gatsby')) tech.push('Gatsby');
      if ((window as any).React) tech.push('React');
      if ((window as any).Vue) tech.push('Vue');
      if (document.querySelector('link[href*="wp-content"]')) tech.push('WordPress');
      if (document.querySelector('script[src*="shopify"]')) tech.push('Shopify');
      return tech;
    });

    // Check Mobile Responsiveness
    const isMobileResponsive = await page.evaluate(() => {
      const viewport = document.querySelector('meta[name="viewport"]');
      return !!viewport;
    });

    // Extract Email Address
    const extractedEmail = await page.evaluate(() => {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
      const match = document.body.innerText.match(emailRegex) || document.documentElement.innerHTML.match(emailRegex);
      if (match) return match[0];
      const mailto = document.querySelector('a[href^="mailto:"]');
      if (mailto) return mailto.getAttribute('href')?.replace('mailto:', '').split('?')[0];
      return null;
    });

    // Save screenshot
    const screenshotDir = path.join(process.cwd(), 'public', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    const filename = `${auditId}-${Date.now()}.webp`;
    const filepath = path.join(screenshotDir, filename);
    await page.screenshot({ path: filepath, type: 'webp', quality: 80 });

    await browser.disconnect();
    await chrome.kill();

    // 4. Update database with combined intelligence
    const audit = await prisma.websiteAudit.update({
      where: { id: auditId },
      data: {
        status: 'DONE',
        completedAt: new Date(),
        pageTitle,
        metaDescription,
        hasSsl,
        isMobileResponsive,
        hasContactForm,
        technologies,
        socialLinks,
        screenshotPath: `/screenshots/${filename}`,
        performanceScore,
        seoScore,
        accessibilityScore,
        bestPracticesScore,
        rawJson: lhr,
      },
    });

    // If an email was found, update the associated Lead's email if it's currently missing
    if (extractedEmail) {
      const lead = await prisma.lead.findUnique({ where: { id: audit.leadId } });
      if (lead && !lead.email) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { email: extractedEmail },
        });
        logger.info(`Updated Lead ${lead.id} with extracted email: ${extractedEmail}`);
      }
    }

    logger.info(`Scanner completed successfully for audit ${auditId}`);

    // 5. Trigger AI Analysis or Scoring based on Settings (Auto AI disabled by default)
    const { settingsService } = require('./settings.service');
    const autoAi = await settingsService.get('autoAiAnalysisEnabled', 'false');
    if (autoAi === 'true') {
      const { analyzeAudit } = require('./ai.service');
      analyzeAudit(auditId).catch((err: any) => {
        logger.error('Background AI analysis failed', { err });
      });
    } else {
      const { calculateLeadScore } = require('./scoring.service');
      calculateLeadScore(auditId).catch((err: any) => {
        logger.error('Background scoring failed', { err });
      });
    }

  } catch (error) {
    logger.error(`Scanner failed for audit ${auditId}`, { error });
    
    if (browser) await browser.disconnect().catch(() => {});
    if (chrome) await chrome.kill();

    await prisma.websiteAudit.update({
      where: { id: auditId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMsg: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
