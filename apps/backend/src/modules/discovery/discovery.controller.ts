import { Request, Response } from 'express';
import { runDiscovery, isDiscoveryRunning } from '../../services/discovery.service';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';

export const triggerDiscovery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requireWebsiteAndEmail } = req.body || {};
    // Run asynchronously without blocking
    runDiscovery({ requireWebsiteAndEmail }).catch((err: any) => {
      logger.error('Manual discovery trigger failed', { err });
    });
    
    res.json({ success: true, message: 'Google Places Discovery started in the background.' });
  } catch (error) {
    logger.error('Failed to trigger discovery', { error });
    res.status(500).json({ success: false, error: 'Failed to trigger discovery' });
  }
};

export const getDiscoveryLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { action: { startsWith: 'DISCOVERY_' } },
      include: {
        discoveryResults: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('Failed to fetch discovery logs', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
};

export const getDiscoveryStatus = async (req: Request, res: Response): Promise<void> => {
  res.json({ success: true, isRunning: isDiscoveryRunning });
};
