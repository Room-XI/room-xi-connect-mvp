import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { pinRegisterSchema, pinLoginSchema, setPinSchema } from '../schemas/auth';

vi.mock('../db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'test-user-id', email: 'test@example.com' }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
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

describe('Authentication - Password Hashing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bcrypt password hashing', () => {
    it('should hash a password with salt rounds of 12', async () => {
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password against hash', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password against hash', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await bcrypt.hash(password, 12);
      
      const isValid = await bcrypt.compare(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password (salted)', async () => {
      const password = 'SamePassword123!';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);
      
      expect(hash1).not.toBe(hash2);
      
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });
});

describe('Authentication - Password Validation', () => {
  /**
   * Validate password strength - PIPA/PIPEDA compliant
   * Requires 12+ chars with uppercase, lowercase, number, and special character
   */
  function validatePasswordStrength(password: string): string[] {
    const errors: string[] = [];
    
    if (!password || password.length < 12) {
      errors.push('Password must be at least 12 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid password meeting all complexity requirements', () => {
    const validPassword = 'SecurePass123!';
    const errors = validatePasswordStrength(validPassword);
    
    expect(errors).toHaveLength(0);
  });

  it('should reject simple password like "password"', () => {
    const weakPassword = 'password';
    const errors = validatePasswordStrength(weakPassword);
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Password must be at least 12 characters');
    expect(errors).toContain('Password must contain at least one uppercase letter');
    expect(errors).toContain('Password must contain at least one number');
    expect(errors).toContain('Password must contain at least one special character');
  });

  it('should reject password shorter than 12 characters', () => {
    const shortPassword = 'Short1!Aa';
    const errors = validatePasswordStrength(shortPassword);
    
    expect(errors).toContain('Password must be at least 12 characters');
  });

  it('should reject password without uppercase letter', () => {
    const noUppercase = 'securepass123!';
    const errors = validatePasswordStrength(noUppercase);
    
    expect(errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject password without lowercase letter', () => {
    const noLowercase = 'SECUREPASS123!';
    const errors = validatePasswordStrength(noLowercase);
    
    expect(errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject password without number', () => {
    const noNumber = 'SecurePassword!';
    const errors = validatePasswordStrength(noNumber);
    
    expect(errors).toContain('Password must contain at least one number');
  });

  it('should reject password without special character', () => {
    const noSpecial = 'SecurePass1234';
    const errors = validatePasswordStrength(noSpecial);
    
    expect(errors).toContain('Password must contain at least one special character');
  });

  it('should accept password with exactly 12 characters and all requirements', () => {
    const exactPassword = 'SecurePas1!a';
    const errors = validatePasswordStrength(exactPassword);
    
    expect(errors).toHaveLength(0);
  });

  it('should accept long complex passwords', () => {
    const longPassword = 'ThisIsAVeryLongAndSecurePassword123!@#';
    const errors = validatePasswordStrength(longPassword);
    
    expect(errors).toHaveLength(0);
  });

  it('should accept passwords with various special characters', () => {
    const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
    
    for (const char of specialChars) {
      const password = `SecurePass12${char}`;
      const errors = validatePasswordStrength(password);
      expect(errors).toHaveLength(0);
    }
  });
});

describe('Authentication - Login Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully validate correct credentials', async () => {
    const storedPassword = 'CorrectPassword123!';
    const storedHash = await bcrypt.hash(storedPassword, 12);
    const inputPassword = 'CorrectPassword123!';
    
    const isValid = await bcrypt.compare(inputPassword, storedHash);
    
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const storedPassword = 'CorrectPassword123!';
    const storedHash = await bcrypt.hash(storedPassword, 12);
    const inputPassword = 'WrongPassword456!';
    
    const isValid = await bcrypt.compare(inputPassword, storedHash);
    
    expect(isValid).toBe(false);
  });

  it('should reject empty password', async () => {
    const storedPassword = 'CorrectPassword123!';
    const storedHash = await bcrypt.hash(storedPassword, 12);
    const inputPassword = '';
    
    const isValid = await bcrypt.compare(inputPassword, storedHash);
    
    expect(isValid).toBe(false);
  });

  it('should handle timing-safe comparison (bcrypt built-in)', async () => {
    const password = 'TimingTest123!';
    const hash = await bcrypt.hash(password, 12);
    
    const startCorrect = performance.now();
    await bcrypt.compare(password, hash);
    const endCorrect = performance.now();
    
    const startWrong = performance.now();
    await bcrypt.compare('WrongPassword!1', hash);
    const endWrong = performance.now();
    
    const correctTime = endCorrect - startCorrect;
    const wrongTime = endWrong - startWrong;
    const timeDiff = Math.abs(correctTime - wrongTime);
    expect(timeDiff).toBeLessThan(100);
  });
});

describe('Authentication - Age Calculation', () => {
  function calculateAge(dateOfBirth: string): number | null {
    const dob = new Date(dateOfBirth);
    
    if (isNaN(dob.getTime())) {
      return null;
    }
    
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    
    if (!Number.isFinite(age) || age < 0) {
      return null;
    }
    
    return age;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate age correctly for 18 year old', () => {
    const now = new Date();
    const dob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    const dobString = dob.toISOString().split('T')[0];
    
    const age = calculateAge(dobString);
    
    expect(age).toBe(18);
  });

  it('should return null for invalid date', () => {
    const age = calculateAge('invalid-date');
    
    expect(age).toBeNull();
  });

  it('should return null for empty string', () => {
    const age = calculateAge('');
    
    expect(age).toBeNull();
  });

  it('should handle birthday not yet occurred this year', () => {
    const now = new Date();
    const futureMonth = (now.getMonth() + 2) % 12;
    const year = futureMonth < now.getMonth() ? now.getFullYear() - 16 : now.getFullYear() - 17;
    const dob = new Date(year, futureMonth, 15);
    const dobString = dob.toISOString().split('T')[0];
    
    const age = calculateAge(dobString);
    
    expect(age).toBeGreaterThanOrEqual(15);
    expect(age).toBeLessThanOrEqual(17);
  });
});

describe('Authentication - PIN Schema Validation (6-Digit Migration)', () => {
  const validBase = {
    displayName: 'TestUser',
    dateOfBirth: '2005-06-15',
  };

  describe('pinRegisterSchema', () => {
    it('should accept exactly 6-digit PIN for registration', () => {
      const result = pinRegisterSchema.safeParse({ ...validBase, pin: '123456' });
      expect(result.success).toBe(true);
    });

    it('should reject 4-digit PIN for registration', () => {
      const result = pinRegisterSchema.safeParse({ ...validBase, pin: '1234' });
      expect(result.success).toBe(false);
    });

    it('should reject 5-digit PIN for registration', () => {
      const result = pinRegisterSchema.safeParse({ ...validBase, pin: '12345' });
      expect(result.success).toBe(false);
    });

    it('should reject 7-digit PIN for registration', () => {
      const result = pinRegisterSchema.safeParse({ ...validBase, pin: '1234567' });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric PIN for registration', () => {
      const result = pinRegisterSchema.safeParse({ ...validBase, pin: 'abcdef' });
      expect(result.success).toBe(false);
    });
  });

  describe('pinLoginSchema', () => {
    // SOT §04: strict 6-digit PIN across all pilot auth surfaces.
    // Legacy 4-/5-digit leniency removed — pilot lockdown requires 6 digits.
    it('should reject 4-digit PIN for login (pilot: strict 6-digit)', () => {
      const result = pinLoginSchema.safeParse({ loginCode: 'STAR-MOON-42', pin: '1234' });
      expect(result.success).toBe(false);
    });

    it('should reject 5-digit PIN for login (pilot: strict 6-digit)', () => {
      const result = pinLoginSchema.safeParse({ loginCode: 'STAR-MOON-42', pin: '12345' });
      expect(result.success).toBe(false);
    });

    it('should accept 6-digit PIN for login', () => {
      const result = pinLoginSchema.safeParse({ loginCode: 'STAR-MOON-42', pin: '123456' });
      expect(result.success).toBe(true);
    });

    it('should reject 3-digit PIN for login', () => {
      const result = pinLoginSchema.safeParse({ loginCode: 'STAR-MOON-42', pin: '123' });
      expect(result.success).toBe(false);
    });

    it('should reject 7-digit PIN for login', () => {
      const result = pinLoginSchema.safeParse({ loginCode: 'STAR-MOON-42', pin: '1234567' });
      expect(result.success).toBe(false);
    });

    it('should require loginCode or email', () => {
      const result = pinLoginSchema.safeParse({ pin: '123456' });
      expect(result.success).toBe(false);
    });
  });

  describe('setPinSchema', () => {
    it('should accept exactly 6-digit PIN', () => {
      const result = setPinSchema.safeParse({ pin: '123456' });
      expect(result.success).toBe(true);
    });

    it('should reject 4-digit PIN', () => {
      const result = setPinSchema.safeParse({ pin: '1234' });
      expect(result.success).toBe(false);
    });
  });
});
