import express from 'express';
import { db } from '../db.js';
import { profiles, guardianVerifications } from '../schema.js';
import { parentLinks, parents } from '../schema.extras.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

// Pilot rule (SOT LOCKED RULES): parent portal scope = consent wallet only.
// No program names, schedules, attendance, mood/check-ins, support details,
// referral details outside consent scope, or Ximi data may be exposed on
// parent-portal endpoints. Consent lives on the canonical wallet at
// /api/pilot/consent — NOT here.
//
// Naming decision (audit C10, Task #40 subtask 4): we KEEP the legacy
// `/api/parent-portal` mount path rather than renaming it to
// `/api/pilot/parent/*`. Reasons:
//   1. Surface is tiny — only /session, /children, and
//      /notification-preferences (4 handlers total) — and the
//      deny-by-default `pilotDataGate` below already bounds the
//      attack surface. The misleading "portal" name is a doc
//      concern, not a security concern.
//   2. Renaming would touch the frontend (api.parentPortal.* in
//      ParentPortal.tsx + ParentSettings.tsx — 7 callsites), the
//      session cookie scope, and the parent-forbidden.test.ts
//      fixture — all higher-risk than the value of the rename.
//   3. The canonical pilot routes ARE under /api/pilot/* (see
//      server/index.js mount block); this file is just an adapter
//      for the parent UX shell. Documented in replit.md.
//
// T005 (Phase 1e): allow-list. Any new route added here is denied by
// default and must be explicitly added to PILOT_PARENT_ALLOWED_PATHS.
//
// T009 side-quest (Phase 3b): the previous version of this file kept ~20
// dead handlers (youth-data, mood-summary, dashboard, alerts, documents,
// emergency-contacts, etc.) that were 403'd by the gate but still
// imported `getFilteredYouthData` — a "live wire" that fetched mood,
// attendance, and demographics. Defense-in-depth dictates removing the
// code, not just gating it. All non-allow-listed handlers are deleted.
//
// Allowed surfaces:
//   - GET  /session                  — current parent session
//   - GET  /children                 — list of linked youth (wallet UX)
//   - GET  /notification-preferences — push-notif prefs
//   - PUT  /notification-preferences — update push-notif prefs
//   - /auth/*                        — reserved for future parent auth subroutes
const PILOT_PARENT_ALLOWED_PATHS = new Set([
  '/session',
  '/children',
  '/notification-preferences',
]);

const PILOT_PARENT_ALLOWED_PREFIXES = ['/auth/'];

const pilotDataGate = (req, res, next) => {
  const path = req.path;
  if (PILOT_PARENT_ALLOWED_PATHS.has(path)) {
    return next();
  }
  for (const prefix of PILOT_PARENT_ALLOWED_PREFIXES) {
    if (path.startsWith(prefix)) {
      return next();
    }
  }
  return res.status(403).json({
    error: 'This data is not available in the parent portal. Use the Consent Wallet to manage consent.',
    code: 'PILOT_DATA_GATE',
  });
};

router.use(pilotDataGate);

const requireParent = (req, res, next) => {
  if (!req.session?.parentId) {
    return res.status(401).json({ error: 'Parent authentication required' });
  }
  next();
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  consentRequests: true,
  referrals: true,
  documents: true,
  moodAlerts: true,
};

router.get('/session', requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;

    const [parent] = await db
      .select({
        id: parents.id,
        firstName: sql`SPLIT_PART(${parents.name}, ' ', 1)`,
        lastName: sql`SPLIT_PART(${parents.name}, ' ', 2)`,
        email: parents.email,
      })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    const links = await db
      .select()
      .from(parentLinks)
      .where(eq(parentLinks.parentId, parentId));

    const pendingDocs = await db
      .select({ count: sql`count(*)::int` })
      .from(guardianVerifications)
      .where(
        and(
          inArray(guardianVerifications.userId, links.map(l => l.userId)),
          eq(guardianVerifications.status, 'pending')
        )
      );

    res.json({
      parent: {
        id: parent.id,
        firstName: parent.firstName || 'Parent',
        lastName: parent.lastName || '',
        email: parent.email,
      },
      childrenCount: links.length,
      pendingDocuments: pendingDocs[0]?.count || 0,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-portal-session' }, 'Error fetching session');
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.get('/children', requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;

    const links = await db
      .select({
        userId: parentLinks.userId,
        relation: parentLinks.relation,
        verifiedAt: parentLinks.verifiedAt,
      })
      .from(parentLinks)
      .where(eq(parentLinks.parentId, parentId));

    const children = await Promise.all(
      links.map(async (link) => {
        const [profile] = await db
          .select({
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            preferredName: profiles.preferredName,
            age: profiles.age,
          })
          .from(profiles)
          .where(eq(profiles.userId, link.userId))
          .limit(1);

        return {
          id: link.userId,
          firstName: profile?.preferredName || profile?.firstName || 'Unknown',
          lastName: profile?.lastName || '',
          age: profile?.age || null,
          relation: link.relation,
          verifiedAt: link.verifiedAt,
        };
      })
    );

    res.json(children);
  } catch (error) {
    logger.error({ err: error, context: 'parent-portal-children' }, 'Error fetching children');
    res.status(500).json({ error: 'Failed to fetch children' });
  }
});

router.get('/notification-preferences', requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;

    const [parent] = await db
      .select({ notificationPreferences: parents.notificationPreferences })
      .from(parents)
      .where(eq(parents.id, parentId))
      .limit(1);

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    res.json({
      success: true,
      preferences: parent.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-portal-get-notification-prefs' }, 'Error fetching notification preferences');
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.put('/notification-preferences', requireParent, async (req, res) => {
  try {
    const parentId = req.session.parentId;
    const { consentRequests, referrals, documents, moodAlerts } = req.body;

    const preferences = {
      consentRequests: consentRequests !== undefined ? !!consentRequests : true,
      referrals: referrals !== undefined ? !!referrals : true,
      documents: documents !== undefined ? !!documents : true,
      moodAlerts: moodAlerts !== undefined ? !!moodAlerts : true,
    };

    await db
      .update(parents)
      .set({
        notificationPreferences: preferences,
        updatedAt: new Date(),
      })
      .where(eq(parents.id, parentId));

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    logger.error({ err: error, context: 'parent-portal-update-notification-prefs' }, 'Error updating notification preferences');
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

export default router;
