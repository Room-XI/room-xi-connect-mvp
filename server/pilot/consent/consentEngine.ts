/**
 * Pilot Consent Engine — canonical runtime consent authority.
 *
 * Per SOT §04_AUTH_AND_CONSENT_SPEC and §07_SCHEMA_SPEC, the canonical
 * tables are the single source of truth for runtime consent decisions:
 *
 *   - consent_templates
 *   - consent_requests
 *   - consent_receipts
 *   - consent_audit_events
 *   - parent_magic_links
 *
 * Legacy consent tables (consents, consent_events, privacy_consents,
 * parent_youth_consent, consent_delegations) remain for migration and
 * historical reference ONLY — they must not make pilot runtime decisions.
 *
 * Flow: template → request → receipt → audit event
 *
 * Cascades (handled by the consent-wallet sign/decline/withdraw routes):
 *   - parent sign     → pending_consent RSVPs become confirmed
 *   - parent decline  → pending_consent RSVPs cancelled
 *   - parent withdraw → pending_consent AND confirmed RSVPs cancelled
 *
 * This module exports the consent-request lifecycle helpers used by
 * RSVP and referral flows AND the sign/decline/withdraw decision flow.
 * All consent decisions and creations flow through here — the routes in
 * server/routes/consent-wallet.ts are now thin HTTP adapters that
 * translate typed engine errors to status codes (T007 — Phase 2 cutover).
 */

import { db } from '../../db.js';
import {
  consentRequests,
  consentTemplates,
  consentReceipts,
  consentAuditEvents,
  eventRsvps,
} from '../../schema.extras.js';
import { and, eq, isNull, or } from 'drizzle-orm';
import logger from '../../logger.ts';

/**
 * Executor that exposes the subset of the Drizzle query API used here.
 * Accepts either the top-level `db` or a transaction handle (`tx`) so
 * callers inside an existing transaction can keep their atomicity.
 */
export type Executor = typeof db;

const CONSENT_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class ConsentTemplateUnavailableError extends Error {
  public readonly httpStatus = 409;
  public readonly code = 'CONSENT_TEMPLATE_UNAVAILABLE';
  constructor(message = 'Consent required but no active consent template is available.') {
    super(message);
    this.name = 'ConsentTemplateUnavailableError';
  }
}

export interface FindOrCreateConsentRequestParams {
  /** Youth the consent is for. */
  youthId: string;
  /** Parent who must sign. */
  parentId: string;
  /** Program the consent is bound to. */
  programId: string;
  /** Source flow that triggered creation — recorded in audit metadata. */
  source: 'event_rsvp' | 'referral_accept' | string;
  /** Actor making the call (usually the youth themselves). */
  actorId: string;
  /** Actor type for the audit row. */
  actorType?: 'youth' | 'staff' | 'parent' | 'system';
  /** Free-form metadata merged into the audit event (e.g. eventId, referralId). */
  sourceMetadata?: Record<string, unknown>;
  /** Caller's network context for the audit row. */
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ConsentRequestSnapshot {
  /** consent_requests.id */
  id: string;
  /** Current status — caller maps 'signed' → confirmed, otherwise pending_consent. */
  status: 'pending' | 'signed' | string;
  /** True when this call inserted a new request; false when an existing one was reused. */
  created: boolean;
}

/**
 * Find an open program consent_request for (youth, parent, program) — or
 * create one (plus its audit event) if none exists. Idempotent for any
 * (youth, parent, program) tuple that already has a 'pending' or 'signed'
 * request.
 *
 * Pass an existing transaction as `executor` to participate in caller
 * atomicity. Otherwise this opens its own transaction so the
 * consent_request and consent_audit_event rows are written together.
 *
 * Throws {@link ConsentTemplateUnavailableError} when no active program
 * template exists — fails closed (never silently confirms a minor's RSVP).
 */
export async function findOrCreateConsentRequest(
  executor: Executor | null,
  params: FindOrCreateConsentRequestParams,
): Promise<ConsentRequestSnapshot> {
  const run = async (tx: Executor): Promise<ConsentRequestSnapshot> => {
    const [existing] = await tx
      .select({ id: consentRequests.id, status: consentRequests.status })
      .from(consentRequests)
      .innerJoin(consentTemplates, eq(consentRequests.templateId, consentTemplates.id))
      .where(
        and(
          eq(consentRequests.youthId, params.youthId),
          eq(consentRequests.parentId, params.parentId),
          eq(consentTemplates.consentType, 'program'),
          or(
            eq(consentRequests.programId, params.programId),
            isNull(consentRequests.programId),
          ),
          or(
            eq(consentRequests.status, 'signed'),
            eq(consentRequests.status, 'pending'),
          ),
        ),
      )
      .limit(1);

    if (existing) {
      return { id: existing.id, status: existing.status, created: false };
    }

    const [platformTemplate] = await tx
      .select({ id: consentTemplates.id })
      .from(consentTemplates)
      .where(
        and(
          eq(consentTemplates.consentType, 'program'),
          eq(consentTemplates.active, true),
        ),
      )
      .limit(1);

    if (!platformTemplate) {
      throw new ConsentTemplateUnavailableError();
    }

    // T007 (Phase 2): wrap the INSERT in a SAVEPOINT (Drizzle's nested
    // tx.transaction() emits SAVEPOINT/ROLLBACK TO SAVEPOINT). This is
    // required so the unique-partial-index violation only aborts the
    // SAVEPOINT — not our outer transaction — letting us re-SELECT the
    // row that won the race and return it as if it were ours.
    //
    // Drizzle wraps the underlying pg error in DrizzleQueryError, so we
    // check both the wrapper and `.cause` for code '23505'.
    let request: { id: string };
    try {
      request = await tx.transaction(async (sp) => {
        const inserted = await sp
          .insert(consentRequests)
          .values({
            templateId: platformTemplate.id,
            youthId: params.youthId,
            parentId: params.parentId,
            programId: params.programId,
            status: 'pending',
            expiresAt: new Date(Date.now() + CONSENT_REQUEST_TTL_MS),
            createdBy: params.actorId,
          })
          .returning({ id: consentRequests.id });
        return inserted[0];
      });
    } catch (err: unknown) {
      const e = err as { code?: string; cause?: { code?: string } };
      const isUniqueViolation = e?.code === '23505' || e?.cause?.code === '23505';
      if (!isUniqueViolation) throw err;
      const [winner] = await tx
        .select({ id: consentRequests.id, status: consentRequests.status })
        .from(consentRequests)
        .where(and(
          eq(consentRequests.youthId, params.youthId),
          eq(consentRequests.parentId, params.parentId),
          eq(consentRequests.templateId, platformTemplate.id),
          eq(consentRequests.programId, params.programId),
          or(
            eq(consentRequests.status, 'pending'),
            eq(consentRequests.status, 'signed'),
          ),
        ))
        .limit(1);
      if (!winner) throw err; // unique violation but no row visible — re-throw
      return { id: winner.id, status: winner.status, created: false };
    }

    await tx.insert(consentAuditEvents).values({
      requestId: request.id,
      actorId: params.actorId,
      actorType: params.actorType ?? 'youth',
      action: 'request_auto_created',
      metadata: {
        trigger: params.source,
        parentId: params.parentId,
        programId: params.programId,
        ...(params.sourceMetadata ?? {}),
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });

    return { id: request.id, status: 'pending', created: true };
  };

  if (executor) {
    return run(executor);
  }
  return db.transaction(async (tx) => run(tx as unknown as Executor));
}

/**
 * Map a consent_request status to the RSVP status it implies.
 * Centralizes the 'signed' → 'confirmed' / else → 'pending_consent' rule
 * so RSVP and referral flows can't drift.
 */
export function rsvpStatusForConsent(status: string): 'confirmed' | 'pending_consent' {
  return status === 'signed' ? 'confirmed' : 'pending_consent';
}

// ============================================================================
// T007 (Phase 2 — C4 full): Consent decision flow.
// Sign / decline / withdraw move from consent-wallet.ts route handlers into
// this module so every consent state transition lives in one place. Routes
// become thin HTTP adapters that catch typed errors below and translate to
// HTTP status codes.
// ============================================================================

export class ConsentRequestNotFoundError extends Error {
  public readonly httpStatus = 404;
  public readonly code = 'CONSENT_REQUEST_NOT_FOUND';
  constructor(message = 'Consent request not found') {
    super(message);
    this.name = 'ConsentRequestNotFoundError';
  }
}

export class ConsentRequestBadStatusError extends Error {
  public readonly httpStatus = 400;
  public readonly code = 'CONSENT_REQUEST_BAD_STATUS';
  constructor(message: string) {
    super(message);
    this.name = 'ConsentRequestBadStatusError';
  }
}

export class ConsentRequestExpiredError extends Error {
  public readonly httpStatus = 410;
  public readonly code = 'CONSENT_REQUEST_EXPIRED';
  constructor(message = 'This consent request has expired') {
    super(message);
    this.name = 'ConsentRequestExpiredError';
  }
}

export interface ConsentDecisionContext {
  requestId: string;
  parentId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface SignConsentParams extends ConsentDecisionContext {
  signature?: string | null;
}

export interface DeclineConsentParams extends ConsentDecisionContext {
  reason?: string | null;
}

export interface WithdrawConsentParams extends ConsentDecisionContext {
  reason?: string | null;
}

export interface ConsentDecisionResult {
  ok: true;
  /** Number of RSVPs auto-cascaded by this decision. */
  cascadedRsvpCount: number;
  /** RSVP ids that were cascaded. */
  cascadedRsvpIds: string[];
}

/**
 * Look up a consent_request and verify it belongs to `parentId`. Returns
 * the row, or throws ConsentRequestNotFoundError. Used by every decision
 * helper below — we never trust the caller's parentId without enforcing
 * row ownership in the same query.
 */
async function fetchOwnedRequest(executor: Executor, requestId: string, parentId: string) {
  const [request] = await executor
    .select()
    .from(consentRequests)
    .where(and(eq(consentRequests.id, requestId), eq(consentRequests.parentId, parentId)))
    .limit(1);
  if (!request) throw new ConsentRequestNotFoundError();
  return request;
}

/**
 * Parent signs a consent request. Atomic:
 *   1. flip status pending → signed
 *   2. insert receipt
 *   3. write request_signed audit event
 *   4. cascade pending_consent RSVPs → confirmed
 *
 * Auto-expires the request (returns ConsentRequestExpiredError) if
 * expiresAt has passed. Refuses to re-sign anything not in 'pending'.
 */
export async function signConsentRequest(params: SignConsentParams): Promise<ConsentDecisionResult> {
  const request = await fetchOwnedRequest(db, params.requestId, params.parentId);

  if (request.status !== 'pending') {
    throw new ConsentRequestBadStatusError(`Cannot sign a request with status: ${request.status}`);
  }

  if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
    await db.update(consentRequests)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(consentRequests.id, params.requestId));
    throw new ConsentRequestExpiredError();
  }

  const [template] = await db.select({ version: consentTemplates.version })
    .from(consentTemplates)
    .where(eq(consentTemplates.id, request.templateId))
    .limit(1);

  let cascadedRsvpIds: string[] = [];

  await db.transaction(async (tx) => {
    await tx.update(consentRequests)
      .set({ status: 'signed', updatedAt: new Date() })
      .where(eq(consentRequests.id, params.requestId));

    await tx.insert(consentReceipts).values({
      requestId: params.requestId,
      signedBy: params.parentId,
      signedAt: new Date(),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      signature: params.signature || 'Electronic consent given',
      templateVersion: template?.version || 1,
    });

    await tx.insert(consentAuditEvents).values({
      requestId: params.requestId,
      actorId: params.parentId,
      actorType: 'parent',
      action: 'request_signed',
      metadata: {
        youthId: request.youthId,
        templateId: request.templateId,
        programId: request.programId,
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });

    const upgraded = await tx.update(eventRsvps)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(and(
        eq(eventRsvps.consentRequestId, params.requestId),
        eq(eventRsvps.status, 'pending_consent'),
      ))
      .returning({ id: eventRsvps.id });
    cascadedRsvpIds = upgraded.map(r => r.id);
  });

  if (cascadedRsvpIds.length > 0) {
    logger.info({
      consentRequestId: params.requestId,
      upgradedCount: cascadedRsvpIds.length,
      rsvpIds: cascadedRsvpIds,
    }, 'Auto-upgraded pending_consent RSVPs to confirmed');
  }

  return { ok: true, cascadedRsvpCount: cascadedRsvpIds.length, cascadedRsvpIds };
}

/**
 * Parent declines a consent request. Atomic:
 *   1. flip status pending → declined
 *   2. cascade pending_consent RSVPs → blocked (cancelReason recorded)
 *   3. write request_declined audit event
 *
 * Refuses anything not in 'pending'.
 */
export async function declineConsentRequest(params: DeclineConsentParams): Promise<ConsentDecisionResult> {
  const request = await fetchOwnedRequest(db, params.requestId, params.parentId);

  if (request.status !== 'pending') {
    throw new ConsentRequestBadStatusError(`Cannot decline a request with status: ${request.status}`);
  }

  let cascadedRsvpIds: string[] = [];

  await db.transaction(async (tx) => {
    await tx.update(consentRequests)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(eq(consentRequests.id, params.requestId));

    const cancelled = await tx.update(eventRsvps)
      .set({
        status: 'blocked',
        cancelledAt: new Date(),
        cancelReason: 'Parent consent declined',
        updatedAt: new Date(),
      })
      .where(and(
        eq(eventRsvps.consentRequestId, params.requestId),
        eq(eventRsvps.status, 'pending_consent'),
      ))
      .returning({ id: eventRsvps.id });
    cascadedRsvpIds = cancelled.map(r => r.id);

    await tx.insert(consentAuditEvents).values({
      requestId: params.requestId,
      actorId: params.parentId,
      actorType: 'parent',
      action: 'request_declined',
      metadata: {
        youthId: request.youthId,
        reason: params.reason ?? null,
        cancelledRsvpCount: cascadedRsvpIds.length,
        cancelledRsvpIds: cascadedRsvpIds,
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  });

  return { ok: true, cascadedRsvpCount: cascadedRsvpIds.length, cascadedRsvpIds };
}

/**
 * Parent withdraws a previously-signed consent. Atomic:
 *   1. flip status signed → withdrawn
 *   2. stamp the existing receipt with withdrawn_at + ip + ua
 *   3. cascade pending_consent AND confirmed RSVPs → blocked
 *      (note: this is wider than decline — a withdraw kills future
 *      attendance even for already-confirmed RSVPs)
 *   4. write consent_withdrawn audit event
 *
 * Refuses anything not in 'signed'.
 */
export async function withdrawConsentRequest(params: WithdrawConsentParams): Promise<ConsentDecisionResult> {
  const request = await fetchOwnedRequest(db, params.requestId, params.parentId);

  if (request.status !== 'signed') {
    throw new ConsentRequestBadStatusError('Can only withdraw previously signed consent');
  }

  let cascadedRsvpIds: string[] = [];

  await db.transaction(async (tx) => {
    await tx.update(consentRequests)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(consentRequests.id, params.requestId));

    const [receipt] = await tx.select()
      .from(consentReceipts)
      .where(eq(consentReceipts.requestId, params.requestId))
      .limit(1);

    if (receipt) {
      await tx.update(consentReceipts)
        .set({
          withdrawnAt: new Date(),
          withdrawnIp: params.ipAddress ?? null,
          withdrawnUserAgent: params.userAgent ?? null,
        })
        .where(eq(consentReceipts.id, receipt.id));
    }

    const cancelled = await tx.update(eventRsvps)
      .set({
        status: 'blocked',
        cancelledAt: new Date(),
        cancelReason: 'Parent consent withdrawn',
        updatedAt: new Date(),
      })
      .where(and(
        eq(eventRsvps.consentRequestId, params.requestId),
        or(
          eq(eventRsvps.status, 'pending_consent'),
          eq(eventRsvps.status, 'confirmed'),
        ),
      ))
      .returning({ id: eventRsvps.id });
    cascadedRsvpIds = cancelled.map(r => r.id);

    await tx.insert(consentAuditEvents).values({
      requestId: params.requestId,
      actorId: params.parentId,
      actorType: 'parent',
      action: 'consent_withdrawn',
      metadata: {
        youthId: request.youthId,
        reason: params.reason ?? null,
        cancelledRsvpCount: cascadedRsvpIds.length,
        cancelledRsvpIds: cascadedRsvpIds,
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  });

  return { ok: true, cascadedRsvpCount: cascadedRsvpIds.length, cascadedRsvpIds };
}
