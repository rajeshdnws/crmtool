import { PrismaClient } from '@prisma/client';
import { config } from './env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// In development, prevent hot-reload from creating multiple instances
export const prisma: PrismaClient =
  global.__prisma ||
  new PrismaClient({
    log: config.isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

if (config.isDev) {
  global.__prisma = prisma;
}
