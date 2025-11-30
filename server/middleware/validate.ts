import type { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    
    if (!parsed.success) {
      const issues = parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        issues,
      });
    }
    
    req.body = parsed.data;
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    
    if (!parsed.success) {
      const issues = parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        issues,
      });
    }
    
    (req as any).query = parsed.data;
    next();
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    
    if (!parsed.success) {
      const issues = parsed.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid URL parameters',
        issues,
      });
    }
    
    (req as any).params = parsed.data;
    next();
  };
}

export default { validateBody, validateQuery, validateParams };
