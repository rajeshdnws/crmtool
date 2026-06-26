import { Request, Response } from 'express';
import { settingsService } from '../../services/settings.service';
import { restartCronJob } from '../../services/cron.service';
import { logger } from '../../config/logger';

export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await settingsService.getSettings();
    // Do not return raw SMTP password or API Key to the frontend in full
    // But since this is an admin panel, maybe we mask it or just send it if they need to edit it.
    // For now, we will send everything because it's required for the form.
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Failed to get settings', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body; // e.g. { openaiApiKey: "...", cronSchedule: "..." }
    
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid payload' });
      return;
    }

    await settingsService.updateMultiple(updates);

    // If cronSchedule was updated, we should restart the cron engine
    if (updates.cronSchedule) {
      await restartCronJob();
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    logger.error('Failed to update settings', { error });
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};

export const triggerAutomation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { runDailyScanner } = require('../../services/cron.service');
    // Run asynchronously without blocking
    runDailyScanner().catch((err: any) => {
      logger.error('Manual automation trigger failed', { err });
    });
    
    res.json({ success: true, message: 'Automation scan started in the background.' });
  } catch (error) {
    logger.error('Failed to trigger automation', { error });
    res.status(500).json({ success: false, error: 'Failed to trigger automation' });
  }
};
