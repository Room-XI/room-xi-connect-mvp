import type { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

interface AppError extends Error {
  statusCode?: number;
  status?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'ERR_UNEXPECTED';
  
  logger.error(
    {
      err: {
        message: err.message,
        code,
        stack: err.stack,
      },
      req: {
        method: req.method,
        url: req.url,
        id: (req as any).id,
      },
      status,
    },
    'Request failed'
  );
  
  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({
      error: code,
      message: err.message,
      stack: err.stack,
    });
  }
  
  if (status >= 400 && status < 500) {
    return res.status(status).json({
      error: code,
      message: err.message,
    });
  }
  
  return res.status(status).json({
    error: 'ERR_INTERNAL',
    message: 'An unexpected error occurred',
  });
}

export default errorHandler;
