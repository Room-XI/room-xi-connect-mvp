/**
 * Crisis Escalation Service
 * 
 * Handles real-time notifications when a crisis is detected via sentiment analysis
 * or Ximi chat. Notifies guardians, emergency contacts, and platform administrators.
 * 
 * PIPA/PIPEDA Compliance:
 * - Never reveals content that triggered the crisis (privacy-preserving)
 * - All escalation attempts are logged for audit trail
 * - Respects consent settings and verification status
 */

import logger from '../logger.ts';
import { db } from '../db.js';
import { 
  crisisEscalations, 
  emergencyContacts, 
  guardianVerifications,
  users,
  profiles 
} from '../schema.ts';
import { eq, and, desc, gte, or } from 'drizzle-orm';
import { sendEmail } from './email.js';
import crypto from 'crypto';
import { scheduleFollowup } from './crisisFollowup.ts';

type SourceType = 'checkin' | 'ximi_chat' | 'journal';

interface EscalationContext {
  userId: string;
  sourceType: SourceType;
  sourceId: string;
  triggerType: 'keywords' | 'ai_detected' | 'both';
}

interface Recipient {
  type: 'guardian' | 'emergency_contact' | 'admin';
  id?: string;
  email: string;
  name: string;
  relationship?: string;
}

const CRISIS_RESOURCES = {
  kidshelpphone: { name: 'Kids Help Phone', number: '1-800-668-6868', url: 'https://kidshelpphone.ca' },
  crisisLine: { name: 'Crisis Services Canada', number: '1-833-456-4566', url: 'https://www.crisisservicescanada.ca' },
  text: { name: 'Text CONNECT', number: '686868', url: 'https://kidshelpphone.ca/get-info/how-text-us' },
};

const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.GMAIL_USER;

function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[no-email]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';
  const maskedLocal = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0][0] + '***.' + domainParts[domainParts.length - 1]
    : '***';
  return `${maskedLocal}@${maskedDomain}`;
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

async function getRecipients(userId: string): Promise<Recipient[]> {
  const recipients: Recipient[] = [];

  const [userRecord] = await db.select({
    id: users.id,
    preferredName: profiles.preferredName,
    firstName: profiles.firstName,
  })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRecord) {
    logger.warn({ userId, context: 'crisis-escalation' }, 'User not found for escalation');
    return recipients;
  }

  const guardians = await db.select({
    id: guardianVerifications.id,
    contactType: guardianVerifications.guardianContactType,
    contactValue: guardianVerifications.guardianContactValue,
    name: guardianVerifications.guardianName,
    status: guardianVerifications.status,
  })
    .from(guardianVerifications)
    .where(and(
      eq(guardianVerifications.userId, userId),
      eq(guardianVerifications.status, 'verified')
    ))
    .orderBy(desc(guardianVerifications.verifiedAt))
    .limit(2);

  for (const g of guardians) {
    if (g.contactType === 'email' && g.contactValue) {
      recipients.push({
        type: 'guardian',
        id: g.id,
        email: g.contactValue,
        name: g.name || 'Guardian',
        relationship: 'Guardian',
      });
    }
  }

  const emergencyContactsList = await db.select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, userId))
    .orderBy(desc(emergencyContacts.isPrimary))
    .limit(3);

  for (const ec of emergencyContactsList) {
    if (ec.email) {
      recipients.push({
        type: 'emergency_contact',
        id: ec.id,
        email: ec.email,
        name: ec.name,
        relationship: ec.relationship,
      });
    }
  }

  if (ADMIN_EMAIL) {
    recipients.push({
      type: 'admin',
      email: ADMIN_EMAIL,
      name: 'Room XI Connect Team',
    });
  }

  return recipients;
}

function generateCrisisEmailHtml(recipientName: string, relationship: string | undefined, youthName: string | null): string {
  const displayName = youthName || 'A young person';
  const relationshipText = relationship ? ` (${relationship})` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2D3748; background-color: #F8F6F0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #2EC489; }
    .alert-box { background: #FFF5F5; border-left: 4px solid #FF6B6B; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .alert-title { font-weight: bold; color: #C53030; margin-bottom: 8px; }
    .info-box { background: #F0FFF4; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .crisis-resources { background: #EBF8FF; border-radius: 8px; padding: 16px; }
    .resource { margin-bottom: 12px; }
    .resource-name { font-weight: bold; color: #2B6CB0; }
    .resource-number { font-size: 18px; color: #2EC489; font-weight: bold; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Room XI Connect</div>
      <p style="color: #718096;">Safety Alert Notification</p>
    </div>
    
    <div class="alert-box">
      <div class="alert-title">Important: Wellness Check Recommended</div>
      <p style="margin: 0;">Our system has detected that <strong>${displayName}</strong>${relationshipText} may be experiencing distress. We recommend reaching out to check in with them.</p>
    </div>
    
    <p>Dear ${recipientName},</p>
    
    <p>You are receiving this notification because you are listed as a trusted contact for a young person using Room XI Connect.</p>
    
    <div class="info-box">
      <strong>What you can do:</strong>
      <ul style="margin-bottom: 0;">
        <li>Reach out to check in with them in a calm, non-judgmental way</li>
        <li>Ask how they're feeling and if they want to talk</li>
        <li>Listen without trying to immediately solve problems</li>
        <li>Encourage them to connect with professional support if needed</li>
      </ul>
    </div>
    
    <div class="crisis-resources">
      <strong>Crisis Resources (Canada):</strong>
      <div class="resource">
        <div class="resource-name">Kids Help Phone</div>
        <div class="resource-number">1-800-668-6868</div>
        <div>Text CONNECT to 686868</div>
      </div>
      <div class="resource">
        <div class="resource-name">Crisis Services Canada</div>
        <div class="resource-number">1-833-456-4566</div>
      </div>
      <div class="resource" style="margin-bottom: 0;">
        <div class="resource-name">Emergency Services</div>
        <div class="resource-number">911</div>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated wellness notification from Room XI Connect.</p>
      <p>For privacy reasons, specific details are not included in this message.</p>
      <p style="margin-bottom: 0;">© ${new Date().getFullYear()} Room XI Connect. Supporting youth wellness in Edmonton.</p>
    </div>
  </div>
</body>
</html>
`;
}

async function logEscalation(
  context: EscalationContext,
  recipient: Recipient,
  channel: 'email' | 'push',
  status: 'pending' | 'sent' | 'failed',
  errorMessage?: string
): Promise<string> {
  const [record] = await db.insert(crisisEscalations).values({
    userId: context.userId,
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    recipientType: recipient.type,
    recipientId: recipient.id,
    recipientEmailHash: hashEmail(recipient.email),
    channel,
    status,
    errorMessage,
    meta: { triggerType: context.triggerType },
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: crisisEscalations.id });

  return record.id;
}

async function sendCrisisEmail(recipient: Recipient, youthName: string | null): Promise<boolean> {
  const subject = 'Room XI Connect - Safety Alert: Wellness Check Recommended';
  const html = generateCrisisEmailHtml(recipient.name, recipient.relationship, youthName);

  try {
    await sendEmail({ to: recipient.email, subject, html });
    return true;
  } catch (err) {
    logger.error({ error: err, recipient: maskEmail(recipient.email), context: 'crisis-escalation' }, 'Failed to send crisis email');
    return false;
  }
}

async function getYouthDisplayName(userId: string): Promise<string | null> {
  const [profile] = await db.select({ 
    preferredName: profiles.preferredName,
    firstName: profiles.firstName,
  })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return profile?.preferredName || profile?.firstName || null;
}

export async function escalateCrisis(context: EscalationContext): Promise<{ sent: number; failed: number }> {
  const { userId, sourceType, sourceId, triggerType } = context;

  logger.info(
    { userId, sourceType, sourceId, triggerType, context: 'crisis-escalation' },
    'Starting crisis escalation workflow'
  );

  const recipients = await getRecipients(userId);

  if (recipients.length === 0) {
    logger.warn({ userId, context: 'crisis-escalation' }, 'No recipients found for crisis escalation');
    return { sent: 0, failed: 0 };
  }

  const youthName = await getYouthDisplayName(userId);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const escalationId = await logEscalation(context, recipient, 'email', 'pending');

    const success = await sendCrisisEmail(recipient, youthName);

    await db.update(crisisEscalations)
      .set({
        status: success ? 'sent' : 'failed',
        deliveredAt: success ? new Date() : undefined,
        errorMessage: success ? undefined : 'Email delivery failed',
        updatedAt: new Date(),
      })
      .where(eq(crisisEscalations.id, escalationId));

    if (success) {
      sent++;
      logger.info(
        { userId, recipientType: recipient.type, recipient: maskEmail(recipient.email), context: 'crisis-escalation' },
        'Crisis notification sent successfully'
      );
    } else {
      failed++;
    }
  }

  logger.info(
    { userId, sourceType, sourceId, sent, failed, context: 'crisis-escalation' },
    'Crisis escalation workflow completed'
  );

  if (sent > 0) {
    const firstEscalationId = await getFirstEscalationId(userId, sourceId);
    if (firstEscalationId) {
      scheduleFollowup(userId, firstEscalationId).catch(err => {
        logger.error({ err, userId, context: 'crisis-followup' }, 'Failed to schedule follow-up after escalation');
      });
    }
  }

  return { sent, failed };
}

async function getFirstEscalationId(userId: string, sourceId: string): Promise<string | null> {
  const [record] = await db.select({ id: crisisEscalations.id })
    .from(crisisEscalations)
    .where(and(
      eq(crisisEscalations.userId, userId),
      eq(crisisEscalations.sourceId, sourceId),
      eq(crisisEscalations.status, 'sent')
    ))
    .orderBy(desc(crisisEscalations.attemptedAt))
    .limit(1);
  return record?.id || null;
}

export async function hasRecentEscalation(userId: string, withinHours: number = 24): Promise<boolean> {
  const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  const [recent] = await db.select({ id: crisisEscalations.id })
    .from(crisisEscalations)
    .where(and(
      eq(crisisEscalations.userId, userId),
      gte(crisisEscalations.attemptedAt, cutoff),
      or(
        eq(crisisEscalations.status, 'sent'),
        eq(crisisEscalations.status, 'pending')
      )
    ))
    .limit(1);

  return !!recent;
}
