import { prisma } from '../config/database';
import { logger } from '../config/logger';

class SettingsService {
  private cache: Record<string, string> = {};
  private lastFetch: number = 0;
  private CACHE_TTL = 60000; // 1 minute

  async getSettings(): Promise<Record<string, string>> {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_TTL && Object.keys(this.cache).length > 0) {
      return this.cache;
    }

    try {
      const settings = await prisma.systemSetting.findMany();
      this.cache = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, string>);
      this.lastFetch = now;
      return this.cache;
    } catch (err) {
      logger.error('Failed to fetch settings from DB', { err });
      return this.cache;
    }
  }

  async get(key: string, fallback?: string): Promise<string> {
    const settings = await this.getSettings();
    return settings[key] ?? fallback ?? '';
  }

  async set(key: string, value: string): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    this.cache[key] = value;
    logger.info(`Setting updated: ${key}`);
  }

  async updateMultiple(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.set(key, value);
    }
  }
}

export const settingsService = new SettingsService();
