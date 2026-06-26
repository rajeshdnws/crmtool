import { Router } from 'express';
import { getAudits, getAuditById, createAudit, triggerScan, downloadPdfReport } from './audits.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/scan/:leadId', requireRole('ADMIN', 'SALES'), triggerScan);
router.get('/:id/pdf', downloadPdfReport);
router.get('/', getAudits);
router.get('/:id', getAuditById);
router.post('/', requireRole('ADMIN', 'SALES'), createAudit);

export default router;
