import { Router } from 'express';
import { login, logout, getMe, register, updateProfile } from './auth.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Only admins can register new users
router.post('/register', authenticate, requireRole('ADMIN'), register);

router.put('/profile', authenticate, updateProfile);

export default router;
