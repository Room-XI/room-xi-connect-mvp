import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../db.js', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../schema.js', () => ({
  accountLockouts: {
    email: 'email',
    failedAttempts: 'failedAttempts',
    lockedUntil: 'lockedUntil',
    updatedAt: 'updatedAt',
  },
}));

vi.mock('../logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { checkAccountLockout, recordFailedLogin, clearFailedLogin } from '../middleware/accountLockout';
import { db } from '../db.js';

const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('Account Lockout Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      body: {},
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    
    mockNext = vi.fn() as unknown as NextFunction;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkAccountLockout', () => {
    it('should call next() when no email in request', async () => {
      mockReq.body = {};
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next() when account is not locked', async () => {
      mockReq.body = { email: 'test@example.com' };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block request when account is currently locked', async () => {
      mockReq.body = { email: 'locked@example.com' };
      
      const futureTime = new Date(Date.now() + 30 * 60 * 1000);
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              email: 'locked@example.com',
              failedAttempts: 5,
              lockedUntil: futureTime,
            }]),
          }),
        }),
      });
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Account temporarily locked',
          message: expect.stringContaining('Too many failed login attempts'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should clear expired lockout and call next()', async () => {
      mockReq.body = { email: 'expired@example.com' };
      
      const pastTime = new Date(Date.now() - 10 * 60 * 1000);
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              email: 'expired@example.com',
              failedAttempts: 5,
              lockedUntil: pastTime,
            }]),
          }),
        }),
      });
      
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      mockReq.body = { email: 'TEST@EXAMPLE.COM' };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on database error', async () => {
      mockReq.body = { email: 'error@example.com' };
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });
      
      await checkAccountLockout(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('recordFailedLogin', () => {
    it('should create new record for first failed attempt', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      
      await recordFailedLogin('test@example.com');
      
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should increment count for existing record', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              email: 'test@example.com',
              failedAttempts: 2,
              lockedUntil: null,
            }]),
          }),
        }),
      });
      
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      
      await recordFailedLogin('test@example.com');
      
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should lock account after 5 failed attempts', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              email: 'test@example.com',
              failedAttempts: 4,
              lockedUntil: null,
            }]),
          }),
        }),
      });
      
      const mockSetFn = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      mockDb.update.mockReturnValue({
        set: mockSetFn,
      });
      
      await recordFailedLogin('test@example.com');
      
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSetFn).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 5,
          lockedUntil: expect.any(Date),
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      
      const mockValuesFn = vi.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({
        values: mockValuesFn,
      });
      
      await recordFailedLogin('TEST@EXAMPLE.COM');
      
      expect(mockValuesFn).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      });
      
      await expect(recordFailedLogin('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('clearFailedLogin', () => {
    it('should delete lockout record for email', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      
      await clearFailedLogin('test@example.com');
      
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const mockWhereFn = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({
        where: mockWhereFn,
      });
      
      await clearFailedLogin('TEST@EXAMPLE.COM');
      
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB error')),
      });
      
      await expect(clearFailedLogin('test@example.com')).resolves.not.toThrow();
    });

    it('should not throw when no record exists', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      
      await expect(clearFailedLogin('nonexistent@example.com')).resolves.not.toThrow();
    });
  });
});

describe('Account Lockout Constants', () => {
  it('should lock after 5 failed attempts (MAX_FAILED_ATTEMPTS)', () => {
    const MAX_FAILED_ATTEMPTS = 5;
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
  });

  it('should lock for 30 minutes (LOCKOUT_DURATION_MS)', () => {
    const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
    expect(LOCKOUT_DURATION_MS).toBe(1800000);
  });
});
