import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/authService';
import { authenticate } from '../middlewares/auth';
import { logger } from '../utils/logger';
import { getCorrelationId } from '../utils/tracing';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.body?.email as string | undefined) ?? req.ip ?? 'unknown',
  message: { error: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2).max(100),
  role: z.enum(['admin', 'recruiter', 'candidate']).default('candidate'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, full_name, role } = registerSchema.parse(req.body);
    const user = await authService.register(email, password, full_name, role);
    logger.info('User registered', { correlationId: getCorrelationId(req), userId: user.id });
    res.status(201).json(user);
  } catch (err) { next(err); }
});

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const tokens = await authService.login(email, password);
    logger.info('User logged in', { correlationId: getCorrelationId(req), email });
    res.json(tokens);
  } catch (err) { next(err); }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await authService.logout(refreshToken);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
