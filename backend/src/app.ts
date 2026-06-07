import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { correlationMiddleware } from './utils/tracing';
import { errorHandler } from './middlewares/errorHandler';
import { config } from './config';
import chatRouter from './routes/chat';

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationMiddleware);

  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use('/api/chat', chatRouter);

  app.use(errorHandler);
  app.use((_req, res) => res.status(404).json({ error: 'Recurso no encontrado' }));

  return app;
};
