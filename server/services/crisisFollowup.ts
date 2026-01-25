/**
 * Crisis Follow-up Service
 * 
 * Schedules and sends gentle check-in messages after crisis detection.
 * This is a safety feature to ensure users feel cared for after a crisis event.
 * 
 * PIPA/PIPEDA Compliance:
 * - Follow-ups are non-invasive and don't reference the crisis content
 * - All follow-up attempts are logged for audit trail
 */

import logger from '../logger.ts';
import { db } from '../db.js';
import { crisisFollowups, ximiConversations, profiles } from '../schema.ts';
import { eq, and, lte, or } from 'drizzle-orm';

const FOLLOWUP_DELAY_HOURS = 24;

const FOLLOWUP_MESSAGE = "Hey, I wanted to check in with you. How are you feeling today?";

export async function scheduleFollowup(
  userId: string, 
  escalationId: string,
  followupType: 'ximi_message' | 'push_notification' = 'ximi_message'
): Promise<string | null> {
  try {
    const existingPending = await db.select({ id: crisisFollowups.id })
      .from(crisisFollowups)
      .where(and(
        eq(crisisFollowups.userId, userId),
        eq(crisisFollowups.status, 'pending')
      ))
      .limit(1);

    if (existingPending.length > 0) {
      logger.info(
        { userId, existingFollowupId: existingPending[0].id, context: 'crisis-followup' },
        'Pending follow-up already exists for user, skipping duplicate'
      );
      return null;
    }

    const scheduledFor = new Date(Date.now() + FOLLOWUP_DELAY_HOURS * 60 * 60 * 1000);

    const [record] = await db.insert(crisisFollowups).values({
      userId,
      escalationId,
      scheduledFor,
      status: 'pending',
      followupType,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({ id: crisisFollowups.id });

    logger.info(
      { userId, followupId: record.id, scheduledFor, followupType, context: 'crisis-followup' },
      'Crisis follow-up scheduled'
    );

    return record.id;
  } catch (error) {
    logger.error(
      { error, userId, escalationId, context: 'crisis-followup' },
      'Failed to schedule crisis follow-up'
    );
    return null;
  }
}

async function sendXimiFollowup(userId: string, followupId: string): Promise<boolean> {
  try {
    const [profile] = await db.select({ ximiConsent: profiles.ximiConsent })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile?.ximiConsent) {
      logger.info(
        { userId, followupId, context: 'crisis-followup' },
        'User has not consented to Ximi, marking follow-up as cancelled'
      );
      await db.update(crisisFollowups)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(crisisFollowups.id, followupId));
      return false;
    }

    await db.insert(ximiConversations).values({
      userId,
      mode: 'unified',
      userMessage: '',
      ximiResponse: FOLLOWUP_MESSAGE,
      moodContext: null,
      dimensionsContext: [],
      crisisDetected: false,
      crisisKeywords: [],
    });

    logger.info(
      { userId, followupId, context: 'crisis-followup' },
      'Ximi follow-up message sent'
    );

    return true;
  } catch (error) {
    logger.error(
      { error, userId, followupId, context: 'crisis-followup' },
      'Failed to send Ximi follow-up'
    );
    return false;
  }
}

export async function checkAndSendFollowups(): Promise<{ sent: number; failed: number; cancelled: number }> {
  const now = new Date();
  let sent = 0;
  let failed = 0;
  let cancelled = 0;

  try {
    const dueFollowups = await db.select()
      .from(crisisFollowups)
      .where(and(
        eq(crisisFollowups.status, 'pending'),
        lte(crisisFollowups.scheduledFor, now)
      ))
      .limit(50);

    if (dueFollowups.length === 0) {
      return { sent, failed, cancelled };
    }

    logger.info(
      { count: dueFollowups.length, context: 'crisis-followup' },
      'Processing due crisis follow-ups'
    );

    for (const followup of dueFollowups) {
      if (followup.followupType === 'ximi_message') {
        const success = await sendXimiFollowup(followup.userId, followup.id);

        if (success) {
          await db.update(crisisFollowups)
            .set({ 
              status: 'sent', 
              sentAt: new Date(),
              updatedAt: new Date() 
            })
            .where(eq(crisisFollowups.id, followup.id));
          sent++;
        } else {
          const [updated] = await db.select({ status: crisisFollowups.status })
            .from(crisisFollowups)
            .where(eq(crisisFollowups.id, followup.id))
            .limit(1);

          if (updated?.status === 'cancelled') {
            cancelled++;
          } else {
            failed++;
          }
        }
      } else {
        logger.warn(
          { followupId: followup.id, followupType: followup.followupType, context: 'crisis-followup' },
          'Unsupported follow-up type, marking as cancelled'
        );
        await db.update(crisisFollowups)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(crisisFollowups.id, followup.id));
        cancelled++;
      }
    }

    logger.info(
      { sent, failed, cancelled, context: 'crisis-followup' },
      'Crisis follow-up processing completed'
    );

  } catch (error) {
    logger.error(
      { error, context: 'crisis-followup' },
      'Error processing crisis follow-ups'
    );
  }

  return { sent, failed, cancelled };
}

export async function cancelFollowup(followupId: string): Promise<boolean> {
  try {
    await db.update(crisisFollowups)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(crisisFollowups.id, followupId));
    
    logger.info({ followupId, context: 'crisis-followup' }, 'Follow-up cancelled');
    return true;
  } catch (error) {
    logger.error({ error, followupId, context: 'crisis-followup' }, 'Failed to cancel follow-up');
    return false;
  }
}

export async function hasPendingFollowup(userId: string): Promise<boolean> {
  const [pending] = await db.select({ id: crisisFollowups.id })
    .from(crisisFollowups)
    .where(and(
      eq(crisisFollowups.userId, userId),
      eq(crisisFollowups.status, 'pending')
    ))
    .limit(1);

  return !!pending;
}
