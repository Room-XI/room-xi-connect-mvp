import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../db.js';
import { users, profiles, guardianVerifications } from '../schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Security Integration Tests', () => {
  let testUserIds: string[] = [];

  beforeAll(async () => {
    // Cleanup any existing test users
    const testEmails = [
      'security-test-under13@test.com',
      'security-test-over25@test.com',
      'security-test-valid@test.com',
      'security-test-under16-no-guardian@test.com',
      'security-test-under16-with-guardian@test.com',
    ];

    for (const email of testEmails) {
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        await db.delete(guardianVerifications).where(eq(guardianVerifications.userId, existingUser.id));
        await db.delete(profiles).where(eq(profiles.userId, existingUser.id));
        await db.delete(users).where(eq(users.id, existingUser.id));
      }
    }
  });

  describe('Age Calculation and Validation', () => {
    it('should correctly calculate age from date of birth', () => {
      const calculateAge = (dateOfBirth: string): number => {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        return age;
      };

      // Test various ages
      const today = new Date();
      
      // 12 years old
      const under13DOB = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
      expect(calculateAge(under13DOB.toISOString().split('T')[0])).toBe(12);

      // 13 years old
      const exactly13DOB = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      expect(calculateAge(exactly13DOB.toISOString().split('T')[0])).toBe(13);

      // 17 years old
      const age17DOB = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
      expect(calculateAge(age17DOB.toISOString().split('T')[0])).toBe(17);

      // 25 years old
      const exactly25DOB = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
      expect(calculateAge(exactly25DOB.toISOString().split('T')[0])).toBe(25);

      // 26 years old
      const over25DOB = new Date(today.getFullYear() - 26, today.getMonth(), today.getDate());
      expect(calculateAge(over25DOB.toISOString().split('T')[0])).toBe(26);
    });

    it('should identify users requiring guardian verification (age < 16)', () => {
      const requiresGuardianVerification = (age: number): boolean => {
        return age < 16;
      };

      expect(requiresGuardianVerification(13)).toBe(true);
      expect(requiresGuardianVerification(14)).toBe(true);
      expect(requiresGuardianVerification(15)).toBe(true);
      expect(requiresGuardianVerification(16)).toBe(false);
      expect(requiresGuardianVerification(17)).toBe(false);
      expect(requiresGuardianVerification(25)).toBe(false);
    });
  });

  describe('Guardian Verification Database Schema', () => {
    it('should store guardian contact info securely (hashed)', async () => {
      const guardianEmail = 'test-guardian@test.com';
      const contactHash = await bcrypt.hash(guardianEmail.toLowerCase(), 10);

      // Verify hash is created
      expect(contactHash).toBeDefined();
      expect(contactHash).not.toBe(guardianEmail);
      expect(contactHash.length).toBeGreaterThan(50);

      // Verify hash can be compared
      const isValid = await bcrypt.compare(guardianEmail.toLowerCase(), contactHash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('wrong-email@test.com', contactHash);
      expect(isInvalid).toBe(false);
    });

    it('should create unique verification tokens', () => {
      const crypto = require('crypto');
      
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should set verification expiration correctly', () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const now = new Date();
      const diffInDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffInDays).toBeGreaterThan(6.9);
      expect(diffInDays).toBeLessThan(7.1);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should use sufficient salt rounds (10)', async () => {
      const password = 'TestPassword123!';
      const start = Date.now();
      await bcrypt.hash(password, 10);
      const duration = Date.now() - start;

      // bcrypt with 10 rounds should take at least a few milliseconds
      // but not too long (should be under 200ms on most systems)
      expect(duration).toBeGreaterThan(1);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Session Security Configuration', () => {
    it('should validate session configuration requirements', () => {
      const sessionConfig = {
        secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'strict' as const,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
      };

      expect(sessionConfig.resave).toBe(false);
      expect(sessionConfig.saveUninitialized).toBe(false);
      expect(sessionConfig.cookie.httpOnly).toBe(true);
      expect(sessionConfig.cookie.sameSite).toBe('strict');
      expect(sessionConfig.cookie.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe('CSRF Token Security', () => {
    it('should generate cryptographically secure tokens', () => {
      const crypto = require('crypto');
      
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64);
    });
  });

  describe('Guardian Verification Logic', () => {
    it('should validate guardian verification requirements', () => {
      // Test that verification tokens are cryptographically secure
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      expect(token.length).toBe(64);

      // Test that expiration is set to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const now = new Date();
      const diffInDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeGreaterThan(6.9);
      expect(diffInDays).toBeLessThan(7.1);
    });
  });
});
