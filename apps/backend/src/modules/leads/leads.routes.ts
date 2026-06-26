import { Router } from 'express';
import { getLeads, getLeadById, createLead, updateLead, deleteLead, bulkCreateLeads, bulkDeleteLeads, sendOutreachEmailController, bulkSendOutreachEmailController, logBulkCampaignController, bulkSyncFromExtension } from './leads.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Allow Chrome Extension to sync data without authentication session cookie issues
router.post('/extension-sync', bulkSyncFromExtension);

router.use(authenticate);

router.post('/bulk', requireRole('ADMIN', 'SALES'), bulkCreateLeads);
router.delete('/bulk', requireRole('ADMIN'), bulkDeleteLeads);
router.post('/bulk/outreach', requireRole('ADMIN', 'SALES'), bulkSendOutreachEmailController);
router.post('/bulk/log', requireRole('ADMIN', 'SALES'), logBulkCampaignController);
router.get('/', getLeads);
router.get('/:id', getLeadById);
router.post('/', requireRole('ADMIN', 'SALES'), createLead);
router.post('/:id/outreach', requireRole('ADMIN', 'SALES'), sendOutreachEmailController);
router.put('/:id', requireRole('ADMIN', 'SALES'), updateLead);
router.delete('/:id', requireRole('ADMIN'), deleteLead);

export default router;
