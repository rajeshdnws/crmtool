import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getUsers, createUser, updateUser, deleteUser } from './users.controller';

const router = Router();

// Secure all user management routes to ADMIN only
router.use(authenticate);
router.use(requireRole('ADMIN'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
