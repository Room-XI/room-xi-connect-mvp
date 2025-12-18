import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { consents, consentEvents, guardianVerifications, profiles, users } from '../schema.js';
import { eq, and } from 'drizzle-orm';

export interface ConsentRequest {
  userId: string;
  consentType: string;
  value: boolean;
  ipAddress?: string;
  userAgent?: string;
  grantedBy?: string;
}

export interface GuardianVerificationRequest {
  userId: string;
  guardianContactType: 'email' | 'sms';
  guardianContactValue: string;
}

export async function checkAgeGating(dateOfBirth: Date): Promise<boolean> {
  const age = getAge(dateOfBirth);
  return age < 16;
}

export function getAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
}

export async function grantConsent(request: ConsentRequest): Promise<void> {
  const { userId, consentType, value, ipAddress, userAgent, grantedBy } = request;
  
  const existingConsent = await db
    .select()
    .from(consents)
    .where(and(
      eq(consents.userId, userId),
      eq(consents.consentType, consentType)
    ))
    .limit(1);
  
  const oldValue = existingConsent.length > 0 ? existingConsent[0].value : null;
  
  await db
    .insert(consents)
    .values({
      userId,
      consentType,
      value,
      ipAddress,
      userAgent,
      grantedBy: grantedBy || 'self',
      textVersion: '1.0',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [consents.userId, consents.consentType],
      set: {
        value,
        ipAddress,
        userAgent,
        grantedBy: grantedBy || 'self',
        updatedAt: new Date(),
      },
    });
  
  await db.insert(consentEvents).values({
    userId,
    actor: grantedBy || 'self',
    eventType: value ? 'grant' : 'revoke',
    consentKey: consentType,
    oldValue: oldValue,
    newValue: value,
    ipAddress,
    userAgent,
    occurredAt: new Date(),
  });
}

export async function revokeConsent(userId: string, consentType: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await grantConsent({
    userId,
    consentType,
    value: false,
    ipAddress,
    userAgent,
    grantedBy: 'self',
  });
}

export async function getUserConsents(userId: string): Promise<Record<string, boolean>> {
  const userConsents = await db
    .select()
    .from(consents)
    .where(eq(consents.userId, userId));
  
  const consentMap: Record<string, boolean> = {};
  for (const consent of userConsents) {
    consentMap[consent.consentType] = consent.value;
  }
  
  return consentMap;
}

export async function generateGuardianToken(request: GuardianVerificationRequest): Promise<string> {
  const { userId, guardianContactType, guardianContactValue } = request;
  
  const token = crypto.randomBytes(32).toString('hex');
  const contactHash = crypto.createHash('sha256').update(guardianContactValue).digest('hex');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await db.insert(guardianVerifications).values({
    userId,
    guardianContactType,
    guardianContactValue,
    guardianContactHash: contactHash,
    verificationToken: token,
    expiresAt,
    createdAt: new Date(),
  });
  
  return token;
}

export async function verifyGuardianWithPIN(token: string, pin: string, guardianName: string, ipAddress?: string): Promise<boolean> {
  const verification = await db
    .select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.verificationToken, token))
    .limit(1);
  
  if (verification.length === 0) {
    throw new Error('Invalid verification token');
  }
  
  const record = verification[0];
  
  if (record.expiresAt < new Date()) {
    throw new Error('Verification token has expired');
  }
  
  if (record.verifiedAt) {
    throw new Error('Verification already completed');
  }
  
  if (!record.pinHash) {
    const pinHash = await bcrypt.hash(pin, 12);
    await db
      .update(guardianVerifications)
      .set({
        pinHash,
        verifiedAt: new Date(),
        verifiedByName: guardianName,
        verifiedByIp: ipAddress,
      })
      .where(eq(guardianVerifications.id, record.id));
    
    await db.insert(consentEvents).values({
      userId: record.userId,
      actor: `guardian:${guardianName}`,
      eventType: 'guardian_verified',
      ipAddress,
      notes: `Guardian verification completed via ${record.guardianContactType}`,
      occurredAt: new Date(),
    });
    
    return true;
  }
  
  const pinValid = await bcrypt.compare(pin, record.pinHash);
  if (!pinValid) {
    throw new Error('Invalid PIN');
  }
  
  return true;
}

export async function checkGuardianVerificationStatus(userId: string): Promise<{
  required: boolean;
  verified: boolean;
  pending: boolean;
}> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  
  if (!profile || !profile.dateOfBirth) {
    return { required: false, verified: false, pending: false };
  }
  
  const requiresGuardian = await checkAgeGating(new Date(profile.dateOfBirth));
  
  if (!requiresGuardian) {
    return { required: false, verified: false, pending: false };
  }
  
  const verifications = await db
    .select()
    .from(guardianVerifications)
    .where(eq(guardianVerifications.userId, userId));
  
  const verified = verifications.some(v => v.verifiedAt !== null);
  const pending = verifications.some(v => v.verifiedAt === null && v.expiresAt > new Date());
  
  return { required: true, verified, pending };
}

export async function getConsentAuditTrail(userId: string): Promise<any[]> {
  const events = await db
    .select()
    .from(consentEvents)
    .where(eq(consentEvents.userId, userId))
    .orderBy(consentEvents.occurredAt);
  
  return events;
}

export async function exportUserData(userId: string): Promise<any> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  
  const userConsents = await getUserConsents(userId);
  const auditTrail = await getConsentAuditTrail(userId);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    },
    profile,
    consents: userConsents,
    consentHistory: auditTrail,
    exportedAt: new Date().toISOString(),
    dataProtectionNotice: 'This data is provided under Alberta PIPA and FOIP compliance.',
  };
}

export async function deleteUserData(userId: string): Promise<void> {
  await db.insert(consentEvents).values({
    userId,
    actor: 'self',
    eventType: 'data_deletion_requested',
    notes: 'User requested full data deletion',
    occurredAt: new Date(),
  });
  
  await db.delete(users).where(eq(users.id, userId));
}
