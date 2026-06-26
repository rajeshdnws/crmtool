import { prisma } from '../config/database';
import { PlaceInput } from './lead-validator.service';

export class DuplicateDetectionService {
  /**
   * Checks if a place is a duplicate based on:
   * 1. Place ID
   * 2. Website URL
   * 3. Phone Number
   * 4. Business Name similarity
   */
  static async checkDuplicate(place: PlaceInput): Promise<{ isDuplicate: boolean; reason?: string }> {
    // 1. Place ID (Exact match)
    if (place.id) {
      const byPlaceId = await prisma.lead.findUnique({ where: { placeId: place.id } });
      if (byPlaceId) return { isDuplicate: true, reason: `Duplicate placeId (${place.id})` };
    }

    // 2. Website URL
    let website = place.websiteUri?.split('?')[0];
    if (website) {
      // Normalize website for comparison (remove trailing slash and http/https)
      let normalizedWeb = website.replace(/\/$/, '').replace(/^https?:\/\//, '').replace(/^www\./, '');
      const byWebsite = await prisma.lead.findFirst({
        where: { website: { contains: normalizedWeb } }
      });
      if (byWebsite) return { isDuplicate: true, reason: `Duplicate website (${byWebsite.website})` };
    }

    // 3. Phone Number
    if (place.nationalPhoneNumber) {
      // Normalize phone (keep only digits)
      const phoneDigits = place.nationalPhoneNumber.replace(/\D/g, '');
      if (phoneDigits.length >= 7) {
        // Find leads and check phone numbers
        const byPhone = await prisma.lead.findFirst({
           where: { phone: { contains: phoneDigits } }
        });
        if (byPhone) return { isDuplicate: true, reason: `Duplicate phone (${byPhone.phone})` };
      }
    }

    // 4. Business Name Similarity
    if (place.displayName?.text) {
      const name = place.displayName.text;
      const normalizedName = this.normalizeName(name);
      
      // We'll fetch a batch of leads (for performance, maybe limit to recent or same city if possible)
      // Since we don't have city directly in PlaceInput here, we check against all or a subset
      // If the DB gets huge, we'd add city to PlaceInput, but for now checking last 1000 is fine
      const candidates = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: { businessName: true }
      });

      for (const candidate of candidates) {
        const candNorm = this.normalizeName(candidate.businessName);
        if (this.calculateSimilarity(normalizedName, candNorm) > 0.85) {
          return { isDuplicate: true, reason: `Similar business name to existing lead (${candidate.businessName})` };
        }
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Normalizes a business name by lowercasing and removing punctuation
   */
  private static normalizeName(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Levenshtein distance based similarity (returns 0.0 to 1.0)
   */
  private static calculateSimilarity(s1: string, s2: string): number {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength.toString());
  }

  private static editDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}
