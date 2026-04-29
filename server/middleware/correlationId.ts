import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../logger.ts';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader('X-Request-Id', id);
  (req as any).log = logger.child({ reqId: id });
  next();
}
