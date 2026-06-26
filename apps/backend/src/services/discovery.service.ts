import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { settingsService } from './settings.service';
import { runScanner } from './scanner.service';
import { validateLead, PlaceInput } from './lead-validator.service';

export let isDiscoveryRunning = false;

export const runDiscovery = async (options?: { requireWebsiteAndEmail?: boolean }): Promise<void> => {
  if (isDiscoveryRunning) {
    logger.warn('Discovery is already running. Skipping new trigger.');
    return;
  }
  isDiscoveryRunning = true;
  logger.info('Starting Google Places Discovery...');

  // 1. Fetch Discovery Settings
  const apiKey = await settingsService.get('googleApiKey', '');
  if (!apiKey) {
    logger.warn('Discovery skipped: Google API Key is missing. Configure it in Settings.');
    return;
  }

  const isEnabled = await settingsService.get('discoveryEnabled', 'true');
  if (isEnabled === 'false') {
    logger.info('Discovery skipped: Disabled in Settings.');
    return;
  }

  const categoriesStr = await settingsService.get(
    'discoveryCategories',
    'School, Coaching Institute, Hospital, Clinic, Real Estate Agency, Manufacturer, Restaurant'
  );
  const citiesStr = await settingsService.get(
    'discoveryCities',
    'Noida, Greater Noida, Ghaziabad, Delhi, Gurgaon, Faridabad'
  );
  const dailyLimitStr = await settingsService.get('discoveryLimit', '20');

  const categories = categoriesStr.split(',').map(s => s.trim()).filter(Boolean);
  const cities = citiesStr.split(',').map(s => s.trim()).filter(Boolean);
  const maxLeads = parseInt(dailyLimitStr, 10) || 20;

  if (!categories.length || !cities.length) {
    logger.warn('Discovery skipped: No categories or cities configured.');
    return;
  }

  // Pick a random category and city for this run
  const category = categories[Math.floor(Math.random() * categories.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const query = `${category} in ${city}`;

  logger.info(`Running discovery query: "${query}"`);

  // Create start log
  const log = await prisma.activityLog.create({
    data: {
      action: 'DISCOVERY_START',
      details: { timestamp: new Date().toISOString(), query, limit: maxLeads },
    },
  });

  try {
    let approvedCount = 0;
    let rejectedCount = 0;
    let failedCount = 0;
    const rejections: Array<{ name: string; gate: string; reason: string }> = [];
    const errors: any[] = [];
    const discoveryResults: any[] = [];

    let pageToken = '';
    let pagesFetched = 0;
    const MAX_PAGES = 10; // Prevent infinite loop if we can't find valid leads

    // 2. Call Google Places API (New) in a loop until we find enough valid leads
    while (approvedCount < maxLeads && pagesFetched < MAX_PAGES) {
      pagesFetched++;
      logger.info(`Fetching page ${pagesFetched} from Google Places API...`);

      const searchUrl = `https://places.googleapis.com/v1/places:searchText`;
      const bodyParams: any = { textQuery: query, pageSize: 20 };
      if (pageToken) bodyParams.pageToken = pageToken;

      const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Added nextPageToken to the FieldMask
          'X-Goog-FieldMask': 'places.id,places.displayName,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.reviews,nextPageToken',
        },
        body: JSON.stringify(bodyParams),
      });

      const searchData = await searchRes.json();

      if (searchData.error) {
        logger.warn(`Google Places API (New) returned error: ${searchData.error.message}`);
        errors.push({ error: searchData.error.message });
        break; // Stop fetching on error
      }

      const places: PlaceInput[] = searchData.places || [];
      if (places.length === 0) {
        logger.info('No more places found in this query.');
        break;
      }

      // 3. Run each place through the validation pipeline
      for (const place of places) {
        if (approvedCount >= maxLeads) break;

        const businessName = place.displayName?.text || place.id;

        try {
          logger.info(`Validating: ${businessName}...`);

          // ─── Run full validation pipeline ───────────────────────────────
          const validation = await validateLead(place, category, city, options);

          if (!validation.approved) {
            logger.info(`❌ Rejected [${validation.rejectionGate}]: ${businessName} — ${validation.rejectionReason}`);
            rejectedCount++;
            rejections.push({
              name: businessName,
              gate: validation.rejectionGate || 'Unknown',
              reason: validation.rejectionReason || 'Unknown',
            });
            discoveryResults.push({
              activityLogId: log.id,
              businessName,
              website: place.websiteUri ? place.websiteUri.split('?')[0] : null,
              validationStatus: 'REJECTED',
              rejectionGate: validation.rejectionGate,
              rejectionReason: validation.rejectionReason,
              opportunityScore: validation.opportunityScore,
              aiScore: validation.aiConversionProbability || null,
              activityConfidenceScore: validation.activityConfidence?.confidenceScore || null,
            });
            continue;
          }
          // ────────────────────────────────────────────────────────────────

          // Build enriched notes with quality & confidence data
          const website = place.websiteUri ? place.websiteUri.split('?')[0] : null;
          const notesParts: string[] = [];
          if (validation.aiReason) {
            notesParts.push(`AI Insight: ${validation.aiReason}`);
            if (validation.aiRecommendedServices?.length) {
              notesParts.push(`Recommended Services: ${validation.aiRecommendedServices.join(', ')}`);
            }
            if (validation.aiConversionProbability) {
              notesParts.push(`Estimated Conversion Probability: ${validation.aiConversionProbability}%`);
            }
          }
          if (validation.activityConfidence) {
            const c = validation.activityConfidence;
            const recencyDesc = c.mostRecentReviewDaysAgo !== null
              ? c.mostRecentReviewDaysAgo <= 30   ? 'very recently'
              : c.mostRecentReviewDaysAgo <= 90   ? 'within 3 months'
              : c.mostRecentReviewDaysAgo <= 365  ? 'within the past year'
              : `${Math.floor(c.mostRecentReviewDaysAgo / 30)} months ago`
              : 'unknown recency';
            notesParts.push(`Activity: ${c.reviewCount} reviews, ${c.rating}★, last review ${recencyDesc} (${c.recentActivityLevel}) — ${c.confidenceLevel} confidence`);
          }
          if (validation.websiteQuality) {
            const q = validation.websiteQuality;
            const flags = [
              !q.hasSsl && 'No SSL',
              !q.isMobileResponsive && 'Not Mobile-Friendly',
              !q.hasContactForm && 'No Contact Form',
              !q.hasPageTitle && 'Missing Title',
              !q.hasMetaDescription && 'Missing Meta',
            ].filter(Boolean).join(', ');
            notesParts.push(`Website Quality: ${q.qualityScore}/100${flags ? ` (Issues: ${flags})` : ''}`);
          }

          // Create Lead with pre-calculated opportunity score
          const newLead = await prisma.lead.create({
            data: {
              businessName,
              website,
              email: validation.websiteQuality?.discoveredEmail || null,
              phone: place.nationalPhoneNumber || null,
              city,
              industry: category,
              rating: place.rating || null,
              reviews: place.userRatingCount || null,
              placeId: place.id,
              source: 'GOOGLE_DISCOVERY',
              status: 'NEW',
              leadScore: validation.opportunityScore,
              contactScore: validation.contactScore,
              whatsappLink: validation.websiteQuality?.whatsappLink || null,
              whatsappNumber: validation.websiteQuality?.whatsappNumber || null,
              socialLinks: validation.websiteQuality?.socialLinks || undefined,
              emailFound: !!validation.websiteQuality?.discoveredEmail || !!place.email,
              notes: notesParts.length > 0 ? notesParts.join('\n') : null,
            },
          });

          logger.info(`✅ Saved lead: ${businessName} | Score: ${validation.opportunityScore} | Website: ${validation.websiteStatus}`);

          // Trigger Audit only if website is valid
          if (validation.websiteStatus === 'valid' && website) {
            const audit = await prisma.websiteAudit.create({
              data: {
                leadId: newLead.id,
                targetUrl: website,
                status: 'PENDING',
              },
            });

            runScanner(audit.id, website).catch(err => {
              logger.error(`Scanner failed for discovered lead ${newLead.id}`, { err });
            });
          }

          discoveryResults.push({
            activityLogId: log.id,
            businessName,
            website,
            validationStatus: 'APPROVED',
            rejectionGate: null,
            rejectionReason: null,
            opportunityScore: validation.opportunityScore,
            aiScore: validation.aiConversionProbability || null,
            activityConfidenceScore: validation.activityConfidence?.confidenceScore || null,
            leadId: newLead.id,
          });

          approvedCount++;

        } catch (placeErr: any) {
          logger.error(`Failed to process place ${place.id}`, { error: placeErr });
          failedCount++;
          errors.push({ placeId: place.id, error: placeErr.message || 'Unknown' });
        }
      }

      // Check if we have a next page
      if (searchData.nextPageToken) {
        pageToken = searchData.nextPageToken;
      } else {
        logger.info('No more pages from Google API.');
        break;
      }
    }

    // 4. Insert detailed discovery results
    if (discoveryResults.length > 0) {
      await prisma.discoveryResult.createMany({
        data: discoveryResults,
      });
    }

    // 5. Log detailed completion summary
    await completeLog(log.id, approvedCount, rejectedCount, failedCount, errors, rejections);
    logger.info(`Discovery complete. Saved: ${approvedCount}, Rejected: ${rejectedCount}, Errors: ${failedCount}`);

  } catch (error: any) {
    logger.error('Google Places Discovery failed entirely', { error });
    await prisma.activityLog.update({
      where: { id: log.id },
      data: {
        action: 'DISCOVERY_FAILED',
        details: { error: error.message || 'Unknown error' },
      },
    });
  } finally {
    isDiscoveryRunning = false;
  }
};

const completeLog = async (
  id: string,
  approvedCount: number,
  rejectedCount: number,
  failedCount: number,
  errors: any[],
  rejections?: Array<{ name: string; gate: string; reason: string }>,
) => {
  // Build rejection breakdown by gate
  const gateBreakdown: Record<string, number> = {};
  if (rejections) {
    for (const r of rejections) {
      gateBreakdown[r.gate] = (gateBreakdown[r.gate] || 0) + 1;
    }
  }

  await prisma.activityLog.update({
    where: { id },
    data: {
      action: 'DISCOVERY_COMPLETE',
      details: {
        approvedCount,
        rejectedCount,
        failedCount,
        gateBreakdown,
        rejections: rejections?.slice(0, 10) ?? [], // Store top 10 rejection samples
        errors,
        // Keep legacy keys for backward compat
        successCount: approvedCount,
      },
    },
  });
};
