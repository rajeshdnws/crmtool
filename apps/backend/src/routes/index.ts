import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import leadsRoutes from '../modules/leads/leads.routes';
import auditsRoutes from '../modules/audits/audits.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import settingsRoutes from '../modules/settings/settings.routes';
import usersRoutes from '../modules/users/users.routes';
import discoveryRoutes from '../modules/discovery/discovery.routes';
import blacklistRoutes from './blacklist.routes';
import templatesRoutes from '../modules/templates/templates.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'RSOrangeTech API is running', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/leads', leadsRoutes);
router.use('/audits', auditsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);
router.use('/users', usersRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/blacklist', blacklistRoutes);
router.use('/templates', templatesRoutes);

export default router;
