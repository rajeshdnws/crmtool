import { Router } from 'express';
import { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate } from './templates.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/', requireRole('ADMIN', 'SALES'), createTemplate);
router.put('/:id', requireRole('ADMIN', 'SALES'), updateTemplate);
router.delete('/:id', requireRole('ADMIN'), deleteTemplate);

export default router;
