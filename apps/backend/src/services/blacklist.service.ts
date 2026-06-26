import { prisma } from '../config/database';
import { PlaceInput } from './lead-validator.service';

export class BlacklistService {
  /**
   * Extracts the root domain from a full URL.
   * e.g. "https://www.google.com/search" -> "google.com"
   */
  private static extractDomain(url?: string): string | null {
    if (!url) return null;
    try {
      // Add http protocol if missing so URL constructor doesn't fail
      const fullUrl = url.startsWith('http') ? url : `http://${url}`;
      const hostname = new URL(fullUrl).hostname;
      // Strip 'www.' if present
      return hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Checks if the incoming place is blacklisted.
   */
  static async isBlacklisted(place: PlaceInput): Promise<{ blacklisted: boolean; reason?: string }> {
    // 1. Check Domain Blacklist
    const domain = this.extractDomain(place.websiteUri);
    if (domain) {
      // Find exact domain
      const isDomainBlacklisted = await prisma.blacklistedDomain.findUnique({
        where: { domain }
      });

      if (isDomainBlacklisted) {
        return { blacklisted: true, reason: `Domain is blacklisted: ${domain}` };
      }

      // Check if subdomain of a blacklisted domain (e.g. mail.google.com -> google.com)
      // This is a simple contains check, but we'll fetch all domains and check endsWith
      // to be safe (since there shouldn't be too many blacklisted domains initially)
      const allDomains = await prisma.blacklistedDomain.findMany({ select: { domain: true } });
      for (const bd of allDomains) {
        if (domain.endsWith(`.${bd.domain}`) || domain === bd.domain) {
          return { blacklisted: true, reason: `Domain is blacklisted: ${bd.domain}` };
        }
      }
    }

    // 2. Check Business Name Blacklist
    const businessName = place.displayName?.text;
    if (businessName) {
      const lowerName = businessName.toLowerCase();
      // Fetch all blacklisted businesses and check if the name includes the blacklisted term
      // This allows blacklisting "McDonald's" to block "McDonald's New York"
      const allBusinesses = await prisma.blacklistedBusiness.findMany({ select: { name: true } });
      for (const bb of allBusinesses) {
        if (lowerName.includes(bb.name.toLowerCase())) {
          return { blacklisted: true, reason: `Business name contains blacklisted term: ${bb.name}` };
        }
      }
    }

    return { blacklisted: false };
  }

  // --- Admin Methods ---

  static async addDomain(domain: string): Promise<void> {
    const cleanDomain = this.extractDomain(domain) || domain.toLowerCase();
    await prisma.blacklistedDomain.upsert({
      where: { domain: cleanDomain },
      update: {},
      create: { domain: cleanDomain }
    });
  }

  static async removeDomain(domain: string): Promise<void> {
    await prisma.blacklistedDomain.deleteMany({
      where: { domain: domain.toLowerCase() }
    });
  }

  static async addBusiness(name: string): Promise<void> {
    const cleanName = name.trim();
    await prisma.blacklistedBusiness.upsert({
      where: { name: cleanName },
      update: {},
      create: { name: cleanName }
    });
  }

  static async removeBusiness(name: string): Promise<void> {
    await prisma.blacklistedBusiness.deleteMany({
      where: { name: name.trim() }
    });
  }

  static async getBlacklist() {
    const domains = await prisma.blacklistedDomain.findMany({ orderBy: { createdAt: 'desc' } });
    const businesses = await prisma.blacklistedBusiness.findMany({ orderBy: { createdAt: 'desc' } });
    return { domains, businesses };
  }
}
