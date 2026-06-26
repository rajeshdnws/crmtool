import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { settingsService } from './settings.service';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { BlacklistService } from './blacklist.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaceInput {
  id: string;
  email?: string;
  displayName?: { text?: string };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  // Google Places API (New) returns up to 5 most-recent reviews
  reviews?: Array<{
    name?: string;
    relativePublishTimeDescription?: string; // e.g. "2 weeks ago", "3 years ago"
    publishTime?: string;                   // ISO 8601 e.g. "2024-01-15T10:30:00Z"
    rating?: number;
    text?: { text?: string };
  }>;
}

export interface WebsiteQuality {
  hasSsl: boolean;
  isMobileResponsive: boolean;
  hasContactForm: boolean;
  hasEmailAddress: boolean;
  discoveredEmail?: string;
  hasPageTitle: boolean;
  hasMetaDescription: boolean;
  qualityScore: number; // 0-100
  
  // Advanced Opportunity Markers
  isSlow: boolean;
  hasOutdatedDesign: boolean;
  hasChatbot: boolean;
  hasOnlineBooking: boolean;
  hasStudentPortal: boolean;
  hasAdmissionForm: boolean;

  // Contact Enrichment
  whatsappLink?: string;
  whatsappNumber?: string;
  socialLinks?: Record<string, string>;
}

export interface ActivityConfidence {
  reviewCount: number;
  rating: number;
  mostRecentReviewDaysAgo: number | null;  // null = no review timestamp available
  recentActivityLevel: 'ACTIVE' | 'MODERATE' | 'STALE' | 'UNKNOWN';
  confidenceScore: number;                  // 0-100
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ValidationResult {
  approved: boolean;
  rejectionReason?: string;
  rejectionGate?: string;
  opportunityScore: number;
  contactScore: number;
  websiteStatus: 'valid' | 'invalid' | 'missing';
  websiteQuality?: WebsiteQuality;
  activityConfidence?: ActivityConfidence;
  aiApproved?: boolean;
  aiReason?: string;
  aiRecommendedServices?: string[];
  aiConversionProbability?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARKED_PHRASES = [
  'coming soon',
  'under construction',
  'domain for sale',
  'buy this domain',
  'parked domain',
  'this domain is for sale',
  'domain parking',
  'website coming soon',
  'page not found',
  'website unavailable',
  'site unavailable',
  '404 not found',
  '403 forbidden',
  'access denied',
  'placeholder',
  'hello world',
  'default web page',
  'apache2 ubuntu default',
  'welcome to nginx',
  'it works!',
  'index of /',
];

const BLOCKLIST_TERMS = [
  // General junk
  'fake', 'demo', 'sample', 'xxx', 'adult', 'casino', 'loan shark', 'unknown business',
  
  // Government Organizations
  'govt', 'government', 'municipal', 'ministry', 'department of', 'embassy', 'consulate', 'police station', 'post office', 'state bank',

  // National Brands / Large Enterprises
  'mcdonalds', "mcdonald's", 'starbucks', 'subway', 'dominos', 'kfc', 'burger king', 'pizza hut', 'tcs', 'infosys', 'wipro', 'reliance', 'tata', 'walmart',

  // Universities (Targeting Schools & Coaching instead)
  'university', 'college', 'iit ', 'nit ', 'higher education',

  // E-commerce Giants
  'amazon', 'flipkart', 'myntra', 'snapdeal',

  // IT Companies & Existing Competitors
  'software', 'it solutions', 'web design', 'digital marketing', 'seo agency', 'technologies', 'tech solutions', 'app development'
];

// Mobile viewport meta tag detection patterns
const MOBILE_VIEWPORT_PATTERN = /meta[^>]+name=["']viewport["'][^>]*/i;
const MOBILE_RESPONSIVE_PATTERNS = [
  /@media\s*\([^)]*max-width/i,
  /@media\s*\([^)]*min-width/i,
  /bootstrap/i,
  /tailwind/i,
  /foundation/i,
  /bulma/i,
];

// Contact form detection patterns
const CONTACT_FORM_PATTERNS = [
  /<form[^>]*>/i,
  /contact[-_]?form/i,
  /enquiry[-_]?form/i,
  /type=["']tel["']/i,
  /type=["']email["']/i,
  /whatsapp/i,
  /tel:/i,
  /contact[-_]us/i,
  /get[-_]in[-_]touch/i,
];

// ─── Gate 1 is now handled by DuplicateDetectionService ──────────────────────

async function validateAndScanWebsite(
  websiteUri: string | undefined
): Promise<{
  status: 'valid' | 'invalid' | 'missing';
  reason?: string;
  quality?: WebsiteQuality;
}> {
  if (!websiteUri) {
    return { status: 'missing', reason: 'Website missing' };
  }

  let url: URL;
  try {
    url = new URL(websiteUri);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { status: 'invalid', reason: 'Invalid URL protocol' };
    }
  } catch {
    return { status: 'invalid', reason: 'Malformed URL' };
  }

  // Check SSL from URL
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const startTime = Date.now();
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const ttFb = Date.now() - startTime;
    const isSlow = ttFb > 2000; // > 2s is slow
    const hasSsl = url.protocol === 'https:';

    clearTimeout(timeout);

    if (response.status >= 400) {
      return { status: 'invalid', reason: `HTTP ${response.status} error` };
    }

    // Read up to 32KB for quality scanning
    const reader = response.body?.getReader();
    if (!reader) {
      return { status: 'valid', quality: buildQuality(hasSsl, '', '', isSlow) };
    }

    let html = '';
    let bytesRead = 0;
    const maxBytes = 32 * 1024;

    while (bytesRead < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.byteLength;
    }
    reader.cancel();

    const lower = html.toLowerCase();

    // ── Parked/inactive detection ───────────────────────────────────────────
    for (const phrase of PARKED_PHRASES) {
      if (lower.includes(phrase)) {
        return { status: 'invalid', reason: `Parked/inactive site: "${phrase}"` };
      }
    }

    // ── Quality scan ───────────────────────────────────────────────────────
    const quality = buildQuality(hasSsl, html, lower, isSlow);

    return { status: 'valid', quality };

  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { status: 'invalid', reason: 'Website timed out (>10s)' };
    }
    return { status: 'invalid', reason: `Unreachable: ${err.message || 'Network error'}` };
  }
}

function buildQuality(hasSsl: boolean, html: string, lower: string, isSlow: boolean): WebsiteQuality {
  // Page title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const hasPageTitle = !!(titleMatch?.[1]?.trim());

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const hasMetaDescription = !!(metaDescMatch?.[1]?.trim());

  // Mobile responsiveness — viewport meta or CSS media queries
  const hasMobileViewport = MOBILE_VIEWPORT_PATTERN.test(html);
  const hasResponsiveCSS = MOBILE_RESPONSIVE_PATTERNS.some(p => p.test(html));
  const isMobileResponsive = hasMobileViewport || hasResponsiveCSS;

  // Contact form & email
  const hasContactForm = CONTACT_FORM_PATTERNS.some(p => p.test(html));
  
  // Extract email address
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = html.match(emailRegex);
  const discoveredEmail = emailMatch ? emailMatch[0] : undefined;
  const hasEmailAddress = !!discoveredEmail || /mailto:/i.test(html);

  // Extract WhatsApp Link & Number
  let whatsappLink: string | undefined;
  let whatsappNumber: string | undefined;
  const waMatch = html.match(/href=["'](https:\/\/(?:api\.whatsapp\.com\/send\?phone=|wa\.me\/|web\.whatsapp\.com\/send\?phone=)[^"']+)["']/i) 
               || html.match(/href=["'](whatsapp:\/\/send\?phone=[^"']+)["']/i);
  if (waMatch) {
    whatsappLink = waMatch[1];
    const numMatch = whatsappLink.match(/phone=([0-9+]+)/i) || whatsappLink.match(/wa\.me\/([0-9+]+)/i);
    if (numMatch) {
      whatsappNumber = numMatch[1].replace(/\+/g, '');
    }
  }

  // Extract Social Links
  const socialLinks: Record<string, string> = {};
  const socialDomains = ['facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'instagram.com', 'youtube.com'];
  const linkRegex = /href=["'](https?:\/\/(?:www\.)?([^"']+))["']/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const fullLink = match[1];
    const domainPart = match[2].toLowerCase();
    for (const domain of socialDomains) {
      if (domainPart.startsWith(domain)) {
        const platform = domain.split('.')[0];
        if (!socialLinks[platform]) {
          socialLinks[platform] = fullLink;
        }
      }
    }
  }

  // Quality score (0-100)
  let qualityScore = 0;
  let contactScore = 0;
  if (hasSsl)             qualityScore += 25;  // SSL is critical
  if (isMobileResponsive) qualityScore += 30;  // Mobile is critical
  if (hasContactForm) { qualityScore += 20; contactScore += 50; }  // Reachable
  if (hasEmailAddress) { qualityScore += 20; contactScore += 50; }
  if (hasPageTitle)       qualityScore += 15;  // Basic SEO
  if (hasMetaDescription) qualityScore += 10;  // Basic SEO

  logger.info(`Website quality: SSL=${hasSsl} Mobile=${isMobileResponsive} Form=${hasContactForm} Email=${hasEmailAddress} Title=${hasPageTitle} Meta=${hasMetaDescription} → Score: ${qualityScore}`);

  // New advanced heuristics
  const hasOutdatedDesign = lower.includes('<table') && !lower.includes('<div'); // Very basic heuristic
  const hasChatbot = /intercom|drift|tawk\.to|crisp|tidio|chatbot/i.test(lower);
  const hasOnlineBooking = /book(ing)?|appointment|schedule|calendly/i.test(lower);
  const hasStudentPortal = /student(\s|-)portal|moodle|canvas|blackboard|login/i.test(lower);
  const hasAdmissionForm = /admission|apply(\s)?now|enroll/i.test(lower);

  return {
    hasSsl,
    isMobileResponsive,
    hasContactForm,
    hasEmailAddress,
    discoveredEmail,
    whatsappLink,
    whatsappNumber,
    socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
    hasPageTitle,
    hasMetaDescription,
    qualityScore,
    isSlow,
    hasOutdatedDesign,
    hasChatbot,
    hasOnlineBooking,
    hasStudentPortal,
    hasAdmissionForm,
  };
}

// ─── Gate 3: Business Activity + Confidence Score ─────────────────────────────

/**
 * Parse a review's most recent timestamp and return days elapsed since then.
 * Uses publishTime (ISO 8601) if available, or falls back to parsing the
 * relativePublishTimeDescription string from Google ("2 weeks ago", "3 years ago", etc.)
 */
function parseMostRecentReviewDaysAgo(place: PlaceInput): number | null {
  if (!place.reviews || place.reviews.length === 0) return null;

  // Google returns reviews in reverse-chronological order — most recent first
  const latest = place.reviews[0];

  // Prefer ISO timestamp (most accurate)
  if (latest.publishTime) {
    try {
      const reviewDate = new Date(latest.publishTime);
      const diffMs = Date.now() - reviewDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch { /* fall through */ }
  }

  // Fallback: parse relativePublishTimeDescription (e.g. "2 weeks ago", "3 years ago")
  const relative = latest.relativePublishTimeDescription?.toLowerCase() || '';
  if (!relative) return null;

  const num = parseInt(relative.match(/(\d+)/)?.[1] || '0', 10);
  if (!num) return null;

  if (relative.includes('day'))   return num;
  if (relative.includes('week'))  return num * 7;
  if (relative.includes('month')) return num * 30;
  if (relative.includes('year'))  return num * 365;

  return null;
}

async function checkBusinessActivity(
  place: PlaceInput
): Promise<{ pass: boolean; reason?: string; confidence?: ActivityConfidence }> {
  const minReviewsStr = await settingsService.get('discoveryMinReviews', '3');
  const minReviews = parseInt(minReviewsStr, 10) || 3;

  const reviewCount = place.userRatingCount ?? 0;
  const rating = place.rating ?? 0;

  // ── Hard reject: not enough reviews ────────────────────────────────────────
  if (reviewCount < minReviews) {
    return {
      pass: false,
      reason: `Too few reviews: ${reviewCount} (min: ${minReviews}) — Low confidence listing`,
    };
  }

  // ── Recent activity check ───────────────────────────────────────────────────
  const mostRecentReviewDaysAgo = parseMostRecentReviewDaysAgo(place);

  // Determine activity level based on how recent the latest review is
  let recentActivityLevel: ActivityConfidence['recentActivityLevel'] = 'UNKNOWN';
  if (mostRecentReviewDaysAgo !== null) {
    if (mostRecentReviewDaysAgo <= 90)       recentActivityLevel = 'ACTIVE';    // within 3 months
    else if (mostRecentReviewDaysAgo <= 365) recentActivityLevel = 'MODERATE'; // within 1 year
    else if (mostRecentReviewDaysAgo <= 730) recentActivityLevel = 'STALE';    // 1-2 years
    else                                     recentActivityLevel = 'STALE';    // 2+ years
  }

  // Hard reject: last review was 2+ years ago (very stale, low chance of converting)
  if (mostRecentReviewDaysAgo !== null && mostRecentReviewDaysAgo > 730) {
    return {
      pass: false,
      reason: `No recent activity: last review was ${Math.floor(mostRecentReviewDaysAgo / 365)} years ago — stale listing`,
    };
  }

  // ── Confidence scoring (0-100) ──────────────────────────────────────────────
  let confidenceScore = 0;

  // 1. Review volume (0–35 points)
  if (reviewCount >= 100)      confidenceScore += 35;
  else if (reviewCount >= 50)  confidenceScore += 28;
  else if (reviewCount >= 20)  confidenceScore += 20;  // > 20 = higher confidence
  else if (reviewCount >= 10)  confidenceScore += 12;
  else if (reviewCount >= 5)   confidenceScore += 7;
  else                         confidenceScore += 3;   // 3-4 reviews = low confidence

  // 2. Rating quality (0–25 points)
  if (rating >= 4.5)           confidenceScore += 25;
  else if (rating >= 4.0)      confidenceScore += 20;
  else if (rating >= 3.5)      confidenceScore += 12;
  else if (rating >= 3.0)      confidenceScore += 5;
  // below 3.0 = weak signal but still a sales opportunity

  // 3. Recent activity (0–30 points)
  if (recentActivityLevel === 'ACTIVE')        confidenceScore += 30;
  else if (recentActivityLevel === 'MODERATE') confidenceScore += 15;
  else if (recentActivityLevel === 'STALE')    confidenceScore += 5;
  else                                         confidenceScore += 10; // UNKNOWN = neutral

  // 4. Has phone (0–10 points)
  if (place.nationalPhoneNumber) confidenceScore += 10;

  confidenceScore = Math.min(confidenceScore, 100);

  const confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
    confidenceScore >= 60 ? 'HIGH' :
    confidenceScore >= 30 ? 'MEDIUM' : 'LOW';

  const daysDesc = mostRecentReviewDaysAgo !== null
    ? `${mostRecentReviewDaysAgo}d ago`
    : 'unknown recency';

  logger.info(
    `Activity: Reviews=${reviewCount} Rating=${rating}★ LastReview=${daysDesc} Activity=${recentActivityLevel} → Confidence: ${confidenceScore} (${confidenceLevel})`
  );

  return {
    pass: true,
    confidence: {
      reviewCount,
      rating,
      mostRecentReviewDaysAgo,
      recentActivityLevel,
      confidenceScore,
      confidenceLevel,
    },
  };
}

// ─── Gate 4: Industry Blocklist ───────────────────────────────────────────────

function checkIndustryRelevance(businessName: string): { pass: boolean; reason?: string } {
  const lower = businessName.toLowerCase();
  for (const term of BLOCKLIST_TERMS) {
    if (lower.includes(term)) {
      let reasonType = 'Blocked term';
      if (['govt', 'government', 'municipal', 'ministry', 'department'].some(t => term.includes(t))) reasonType = 'Government Org';
      else if (['mcdonald', 'starbucks', 'tcs', 'reliance', 'subway', 'dominos'].some(t => term.includes(t))) reasonType = 'National Brand/Enterprise';
      else if (['university', 'college', 'iit', 'nit'].some(t => term.includes(t))) reasonType = 'University/College';
      else if (['amazon', 'flipkart'].some(t => term.includes(t))) reasonType = 'E-commerce Giant';
      else if (['software', 'it solutions', 'web design', 'digital marketing', 'seo agency', 'technologies', 'tech', 'app development'].some(t => term.includes(t))) reasonType = 'IT Company/Competitor';
      
      return { pass: false, reason: `Rejected Industry (${reasonType}): matched "${term}"` };
    }
  }
  return { pass: true };
}

// ─── Gate 5: Contact Availability ────────────────────────────────────────────

function checkContactAvailability(place: PlaceInput, quality?: WebsiteQuality): { pass: boolean; reason?: string } {
  const hasPhone = !!place.nationalPhoneNumber;
  const hasEmail = quality?.hasEmailAddress || false;
  const hasForm = quality?.hasContactForm || false;

  if (!hasPhone && !hasEmail && !hasForm) {
    return { pass: false, reason: 'No contact method: missing phone, email, and contact form' };
  }
  return { pass: true };
}

// ─── Gate 6: Opportunity Score ────────────────────────────────────────────────

function calculateOpportunityScore(
  place: PlaceInput,
  quality: WebsiteQuality | undefined,
): { score: number; isRejected: boolean; label: string } {
  let score = 0;

  score += 10; // Website Exists (since Gate 2 ensures it)

  const poorSeo = !quality?.hasPageTitle || !quality?.hasMetaDescription;
  if (poorSeo) score += 15;

  const slowWebsite = quality?.isSlow;
  if (slowWebsite) score += 15;

  const noSsl = !quality?.hasSsl;
  if (noSsl) score += 10;

  const notMobileFriendly = !quality?.isMobileResponsive;
  if (notMobileFriendly) score += 20;

  const outdatedDesign = quality?.hasOutdatedDesign;
  if (outdatedDesign) score += 20;

  const missingContactForm = !quality?.hasContactForm;
  if (missingContactForm) score += 10;

  const missingChatbot = !quality?.hasChatbot;
  if (missingChatbot) score += 5;

  const missingBooking = !quality?.hasOnlineBooking;
  if (missingBooking) score += 10;

  const missingStudentPortal = !quality?.hasStudentPortal;
  if (missingStudentPortal) score += 15;

  const missingAdmissionForm = !quality?.hasAdmissionForm;
  if (missingAdmissionForm) score += 15;

  // Normalize score to 100 max
  score = Math.min(score, 100);

  let label = 'Ignore';
  if (score >= 90) label = 'Hot Lead';
  else if (score >= 75) label = 'Warm Lead';
  else if (score >= 60) label = 'Low Priority';

  return { score, label, isRejected: false };
}

// ─── Gate 7: AI Qualification ─────────────────────────────────────────────────

async function aiQualify(
  place: PlaceInput,
  category: string,
  city: string,
  websiteStatus: 'valid' | 'invalid' | 'missing',
  quality: WebsiteQuality | undefined,
  confidence: ActivityConfidence | undefined,
): Promise<{ 
  approved: boolean; 
  reason: string; 
  recommendedServices?: string[]; 
  estimatedConversionProbability?: number 
} | null> {
  try {
    const aiEnabled = await settingsService.get('discoveryAiValidation', 'true');
    if (aiEnabled === 'false') return null;

    const openaiApiKey = await settingsService.get('openaiApiKey', '');
    if (!openaiApiKey) return null;

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const businessName = place.displayName?.text || 'Unknown';

    const websiteInfo = websiteStatus === 'invalid'
      ? 'Website is broken/parked'
      : websiteStatus === 'missing'
      ? 'Website is missing'
      : quality
      ? `Has website (Quality Score: ${quality.qualityScore}/100, SSL: ${quality.hasSsl ? 'Yes' : 'No'}, Mobile: ${quality.isMobileResponsive ? 'Yes' : 'No'}, Contact Form: ${quality.hasContactForm ? 'Yes' : 'No'})`
      : 'Has website';

    const recentActivityDesc = confidence?.mostRecentReviewDaysAgo != null
      ? confidence.mostRecentReviewDaysAgo <= 30  ? 'Very recent (last 30 days)'
      : confidence.mostRecentReviewDaysAgo <= 90  ? 'Active (last 3 months)'
      : confidence.mostRecentReviewDaysAgo <= 365 ? 'Moderate (within 1 year)'
      : `Stale (last review ${Math.floor(confidence.mostRecentReviewDaysAgo / 30)} months ago)`
      : 'Unknown (no review timestamps)';

    const prompt = `
You are a business development analyst for RSOrangeTech, a web design and digital marketing agency based in India.

Evaluate if this local business is a good candidate for web design, SEO, or digital marketing services:

Business: ${businessName}
Industry: ${category}
City: ${city}
Google Rating: ${place.rating ?? 'None'} stars (${place.userRatingCount ?? 0} total reviews)
Recent Review Activity: ${recentActivityDesc}
Activity Confidence: ${confidence?.confidenceLevel ?? 'UNKNOWN'} (score: ${confidence?.confidenceScore ?? 0}/100)
Website Status: ${websiteInfo}
Phone Available: ${place.nationalPhoneNumber ? 'Yes' : 'No'}

Return JSON exactly like this:
{
  "qualificationScore": number (0-100),
  "recommendedServices": string[],
  "estimatedConversionProbability": number (0-100),
  "reasoning": "one sentence explanation"
}
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const approved = parsed.qualificationScore >= 60;

    return {
      approved,
      reason: String(parsed.reasoning || 'No reason provided'),
      recommendedServices: Array.isArray(parsed.recommendedServices) ? parsed.recommendedServices : [],
      estimatedConversionProbability: Number(parsed.estimatedConversionProbability || 0)
    };
  } catch (err: any) {
    logger.warn(`AI qualification failed for ${place.displayName?.text}: ${err.message}`);
    return null; // Don't block if AI fails
  }
}

// ─── Main Validator ───────────────────────────────────────────────────────────

export const validateLead = async (
  place: PlaceInput,
  category: string,
  city: string,
  options?: { requireWebsiteAndEmail?: boolean }
): Promise<ValidationResult> => {
  const businessName = place.displayName?.text || 'Unknown';

  // ── Gate 0: Blacklist ─────────────────────────────────────────────────────
  const blacklistCheck = await BlacklistService.isBlacklisted(place);
  if (blacklistCheck.blacklisted) {
    return { approved: false, rejectionReason: blacklistCheck.reason, rejectionGate: 'Gate0_Blacklist', opportunityScore: 0, contactScore: 0, websiteStatus: 'invalid' };
  }

  // ── Gate 1: Duplicate ─────────────────────────────────────────────────────
  const dupCheck = await DuplicateDetectionService.checkDuplicate(place);
  if (dupCheck.isDuplicate) {
    return { approved: false, rejectionReason: dupCheck.reason, rejectionGate: 'Gate1_Duplicate', opportunityScore: 0, contactScore: 0, websiteStatus: 'invalid' };
  }

  // ── Gate 2: Website Validation + Quality Scan ─────────────────────────────
  const websiteResult = await validateAndScanWebsite(place.websiteUri);
  const hasEmail = !!place.email || !!websiteResult.quality?.hasEmailAddress;
  const hasPhone = !!place.nationalPhoneNumber || !!websiteResult.quality?.whatsappNumber;
  const hasWebsite = websiteResult.status === 'valid';

  // Contact Score Calculation
  let contactScore = 0;
  if (hasWebsite) contactScore += 30;
  if (hasEmail) contactScore += 20;
  if (hasPhone) contactScore += 20;
  if (websiteResult.quality?.whatsappLink) contactScore += 20;
  if (websiteResult.quality?.hasContactForm) contactScore += 10;
  contactScore = Math.min(contactScore, 100);

  if (!hasWebsite && !hasPhone && !hasEmail) {
    return { approved: false, rejectionReason: websiteResult.reason || 'No website and no valid contact', rejectionGate: 'Gate2_Website', opportunityScore: 0, contactScore, websiteStatus: websiteResult.status };
  }

  // ── Gate 3: Business Activity + Confidence ────────────────────────────────
  const activityCheck = await checkBusinessActivity(place);
  if (!activityCheck.pass) {
    return { approved: false, rejectionReason: activityCheck.reason, rejectionGate: 'Gate3_Activity', opportunityScore: 0, contactScore, websiteStatus: websiteResult.status };
  }

  // ── Gate 4: Industry Blocklist ────────────────────────────────────────────
  const relevanceCheck = checkIndustryRelevance(businessName);
  if (!relevanceCheck.pass) {
    return { approved: false, rejectionReason: relevanceCheck.reason, rejectionGate: 'Gate4_Blocklist', opportunityScore: 0, contactScore, websiteStatus: websiteResult.status };
  }

  // ── Gate 5: Contact Availability ─────────────────────────────────────────
  const contactCheck = checkContactAvailability(place, websiteResult.quality);
  if (!contactCheck.pass) {
    return { approved: false, rejectionReason: contactCheck.reason, rejectionGate: 'Gate5_Contact', opportunityScore: 0, contactScore, websiteStatus: websiteResult.status };
  }

  // ── Gate 5b: Strict Mode Contact Check ────────────────────────────────────
  if (options?.requireWebsiteAndEmail) {
    if (!hasWebsite || !hasEmail) {
      return { 
        approved: false, 
        rejectionReason: 'Missing Website or Email (Strict Mode Enabled)', 
        rejectionGate: 'Gate5b_StrictContact', 
        opportunityScore: 0, 
        contactScore, 
        websiteStatus: websiteResult.status 
      };
    }
  }

  // ── Gate 6: Opportunity Score ─────────────────────────────────────────────
  const oppResult = calculateOpportunityScore(place, websiteResult.quality);
  
  // Get threshold from settings (default 75)
  const thresholdStr = await settingsService.get('opportunityScoreThreshold', '75');
  const threshold = parseInt(thresholdStr, 10) || 75;

  if (oppResult.score < threshold && !hasEmail && !hasPhone) {
    return { 
      approved: false, 
      rejectionReason: `Low Opportunity Score: ${oppResult.score} (${oppResult.label}) - Below threshold of ${threshold}`, 
      rejectionGate: 'Gate6_Opportunity', 
      opportunityScore: oppResult.score, 
      contactScore,
      websiteStatus: websiteResult.status 
    };
  }

  // ── Gate 7: AI Qualification ──────────────────────────────────────────────
  const quality = websiteResult.quality;
  const confidence = activityCheck.confidence;

  const aiResult = await aiQualify(place, category, city, websiteResult.status, quality, confidence);
  if (aiResult && !aiResult.approved && !hasEmail && !hasPhone) {
    logger.info(`AI rejected ${businessName}: ${aiResult.reason}`);
    return {
      approved: false,
      rejectionReason: `AI: ${aiResult.reason}`,
      rejectionGate: 'Gate7_AI',
      opportunityScore: oppResult.score,
      contactScore,
      websiteStatus: websiteResult.status,
      websiteQuality: quality,
      activityConfidence: confidence,
      aiApproved: false,
      aiReason: aiResult.reason,
    };
  }

  logger.info(`✅ Validated: ${businessName} | Opportunity: ${oppResult.score} | Contact: ${contactScore} | Confidence: ${confidence?.confidenceLevel} | Website Quality: ${quality?.qualityScore ?? 'N/A'}${aiResult ? ` | AI: ${aiResult.reason}` : ''}`);

  return {
    approved: true,
    opportunityScore: oppResult.score,
    contactScore,
    websiteStatus: websiteResult.status,
    websiteQuality: quality,
    activityConfidence: confidence,
    aiApproved: aiResult?.approved,
    aiReason: aiResult?.reason,
    aiRecommendedServices: aiResult?.recommendedServices,
    aiConversionProbability: aiResult?.estimatedConversionProbability,
  };
}
