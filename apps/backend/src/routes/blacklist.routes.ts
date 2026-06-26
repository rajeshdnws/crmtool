import { Router } from 'express';
import { BlacklistService } from '../services/blacklist.service';

const router = Router();

// Get all blacklist entries
router.get('/', async (req, res) => {
  try {
    const data = await BlacklistService.getBlacklist();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add domain
router.post('/domain', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ success: false, error: 'Domain is required' });
    await BlacklistService.addDomain(domain);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove domain
router.delete('/domain', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ success: false, error: 'Domain is required' });
    await BlacklistService.removeDomain(domain);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add business
router.post('/business', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    await BlacklistService.addBusiness(name);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove business
router.delete('/business', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    await BlacklistService.removeBusiness(name);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
