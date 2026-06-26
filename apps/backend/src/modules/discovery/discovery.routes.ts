import { Router } from 'express';
import { triggerDiscovery, getDiscoveryLogs, getDiscoveryStatus } from './discovery.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Trigger discovery manually
router.post('/run', authenticate, requireRole('ADMIN'), triggerDiscovery);
router.get('/logs', authenticate, requireRole('ADMIN'), getDiscoveryLogs);
router.get('/status', authenticate, requireRole('ADMIN'), getDiscoveryStatus);

export default router;
