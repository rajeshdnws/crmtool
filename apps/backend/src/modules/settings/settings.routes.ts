import { Router } from 'express';
import { getSettings, updateSettings, triggerAutomation } from './settings.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('ADMIN'), getSettings);
router.put('/', authenticate, requireRole('ADMIN'), updateSettings);

// Trigger automation manually
router.post('/automation/run', authenticate, requireRole('ADMIN'), triggerAutomation);

export default router;
