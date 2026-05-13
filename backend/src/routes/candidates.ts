import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middlewares/auth';
import { candidateService, createCandidateSchema } from '../services/candidateService';
import { notificationService } from '../services/notificationService';
import { logger } from '../utils/logger';
import { getCorrelationId } from '../utils/tracing';
import { AuthRequest, CandidateStatus } from '../types';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '15', status } = req.query as Record<string, string>;
    const result = await candidateService.list(
      Math.max(1, parseInt(page, 10)),
      Math.min(100, parseInt(limit, 10)),
      status as CandidateStatus | undefined
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const candidate = await candidateService.getById(req.params.id);
    res.json(candidate);
  } catch (err) { next(err); }
});

router.post('/', authorize('recruiter', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCandidateSchema.parse(req.body);
    const candidate = await candidateService.create(data, req.user!.id);

    logger.info('Candidate created', {
      correlationId: getCorrelationId(req),
      candidateId: candidate.id,
      createdBy: req.user!.id,
    });

    notificationService
      .notifyCandidateCreated(candidate.email, `${candidate.first_name} ${candidate.last_name}`)
      .catch(() => null);

    res.status(201).json(candidate);
  } catch (err) { next(err); }
});

router.patch('/:id/status', authorize('recruiter', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = z.object({
      status: z.enum(['pending', 'interviewed', 'hired', 'rejected']),
    }).parse(req.body);

    const candidate = await candidateService.updateStatus(req.params.id, status);

    logger.info('Candidate status updated', {
      correlationId: getCorrelationId(req),
      candidateId: candidate.id,
      status,
    });

    if (status !== 'pending') {
      notificationService
        .notifyStatusChange(candidate.email, `${candidate.first_name} ${candidate.last_name}`, status)
        .catch(() => null);
    }

    res.json(candidate);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await candidateService.delete(req.params.id);
    logger.info('Candidate deleted', { correlationId: getCorrelationId(req), candidateId: req.params.id });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
