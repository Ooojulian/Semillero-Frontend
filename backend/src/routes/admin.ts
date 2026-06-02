import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth';
import { authService } from '../services/authService';
import { query } from '../db';
import { AuthRequest, User } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).max(100),
  role: z.enum(['admin', 'recruiter', 'candidate']).default('recruiter'),
});

router.post('/users', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role } = createUserSchema.parse(req.body);
    const user = await authService.register(email, password, full_name, role);
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.get('/users', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query<User>(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows as unknown as User[]);
  } catch (err) { next(err); }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
