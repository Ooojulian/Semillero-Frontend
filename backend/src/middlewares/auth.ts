import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getCorrelationId } from '../utils/tracing';
import { AuthRequest, JwtPayload, UserRole } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Missing auth token', { correlationId: getCorrelationId(req), ip: req.ip });
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expirado' : 'Token inválido';
    logger.warn(message, { correlationId: getCorrelationId(req) });
    return res.status(403).json({ error: message });
  }
};

export const authorize = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access', {
        correlationId: getCorrelationId(req),
        userRole: req.user?.role,
        required: roles,
      });
      return res.status(403).json({ error: 'No autorizado para este recurso' });
    }
    next();
  };
