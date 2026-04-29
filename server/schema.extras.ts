import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, guardianVerifications, programs, organizations, programEvents } from "./schema.ts";

export const parentMagicLinks = pgTable("parent_magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("parent_magic_links_email_idx").on(table.email),
  tokenIdx: index("parent_magic_links_token_idx").on(table.tokenHash),
}));

export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  guardianVerificationId: uuid("guardian_verification_id").references(() => guardianVerifications.id, { onDelete: "set null" }),
  passwordSetupToken: text("password_setup_token").unique(),
  passwordSetupExpires: timestamp("password_setup_expires", { withTimezone: true }),
  passwordResetToken: text("password_reset_token").unique(),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  notificationPreferences: jsonb("notification_preferences").default({
    consentRequests: true,
    referrals: true,
    documents: true,
    moodAlerts: true
  }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("parents_email_idx").on(table.email),
  setupTokenIdx: index("parents_setup_token_idx").on(table.passwordSetupToken),
  resetTokenIdx: index("parents_reset_token_idx").on(table.passwordResetToken),
}));

export const parentLinks = pgTable(
  "parent_links",
  {
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    relation: text("relation").notNull(),
    guardianRole: text("guardian_role").default("primary"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => ({
    uq: uniqueIndex("parent_user_uq").on(t.parentId, t.userId),
    pIdx: index("parent_links_parent_idx").on(t.parentId),
    uIdx: index("parent_links_user_idx").on(t.userId),
  })
);

export const parentInvites = pgTable(
  "parent_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uIdx: index("parent_invites_user_idx").on(t.userId),
    eIdx: index("parent_invites_email_idx").on(t.email),
  })
);

export const youthDemographics = pgTable("youth_demographics", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const parentDemographics = pgTable(
  "parent_demographics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pIdx: index("parent_demo_parent_idx").on(t.parentId),
    uIdx: index("parent_demo_user_idx").on(t.userId),
    uq: uniqueIndex("parent_demo_uq").on(t.parentId, t.userId),
  })
);

export const moodTasks = pgTable(
  "mood_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    programEventId: uuid("program_event_id")
      .notNull()
      .references(() => programEvents.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uIdx: index("mood_tasks_user_due_idx").on(t.userId, t.dueAt),
  })
);

export const consentTemplates = pgTable(
  "consent_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    version: integer("version").notNull().default(1),
    consentType: text("consent_type").notNull(),
    requiredFields: jsonb("required_fields").default(sql`'[]'`),
    bodyText: text("body_text"),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("consent_templates_org_idx").on(t.orgId),
    typeIdx: index("consent_templates_type_idx").on(t.consentType),
    activeIdx: index("consent_templates_active_idx").on(t.active),
  })
);

export const consentRequests = pgTable(
  "consent_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => consentTemplates.id, { onDelete: "cascade" }),
    youthId: uuid("youth_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id")
      .references(() => parents.id, { onDelete: "set null" }),
    programId: uuid("program_id")
      .references(() => programs.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    youthIdx: index("consent_requests_youth_idx").on(t.youthId),
    parentIdx: index("consent_requests_parent_idx").on(t.parentId),
    statusIdx: index("consent_requests_status_idx").on(t.status),
    templateIdx: index("consent_requests_template_idx").on(t.templateId),
    programIdx: index("consent_requests_program_idx").on(t.programId),
    // T007 (Phase 2 — C4 full): DB-level idempotency for the consent
    // engine. Prevents two concurrent RSVP/referral flows from creating
    // duplicate open consent_request rows for the same (youth, parent,
    // template, program). The application-level SELECT-then-INSERT in
    // findOrCreateConsentRequest catches the unique-violation, re-SELECTs,
    // and returns the existing row — so callers see the same idempotent
    // result whether the race happened or not.
    uniqueOpenIdx: uniqueIndex("consent_requests_unique_open_idx")
      .on(t.youthId, t.parentId, t.templateId, t.programId)
      .where(sql`status IN ('pending', 'signed')`),
  })
);

export const consentReceipts = pgTable(
  "consent_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => consentRequests.id, { onDelete: "cascade" }),
    signedBy: uuid("signed_by")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    signedAt: timestamp("signed_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    signature: text("signature"),
    templateVersion: integer("template_version"),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    withdrawnIp: text("withdrawn_ip"),
    withdrawnUserAgent: text("withdrawn_user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    requestIdx: index("consent_receipts_request_idx").on(t.requestId),
    signedByIdx: index("consent_receipts_signed_by_idx").on(t.signedBy),
  })
);

export const consentAuditEvents = pgTable(
  "consent_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .references(() => consentRequests.id, { onDelete: "set null" }),
    actorId: text("actor_id").notNull(),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    metadata: jsonb("metadata").default(sql`'{}'`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    requestIdx: index("consent_audit_events_request_idx").on(t.requestId),
    actorIdx: index("consent_audit_events_actor_idx").on(t.actorId, t.actorType),
    actionIdx: index("consent_audit_events_action_idx").on(t.action),
    timeIdx: index("consent_audit_events_time_idx").on(t.occurredAt),
  })
);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => programEvents.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("open"),
    sessionToken: text("session_token").notNull(),
    tokenRotatedAt: timestamp("token_rotated_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by")
      .references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    eventIdx: index("attendance_sessions_event_idx").on(t.eventId),
    orgIdx: index("attendance_sessions_org_idx").on(t.orgId, t.status),
    statusIdx: index("attendance_sessions_status_idx").on(t.status),
    tokenIdx: uniqueIndex("attendance_sessions_token_idx").on(t.sessionToken),
  })
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").notNull(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).defaultNow().notNull(),
    checkedInBy: uuid("checked_in_by")
      .references(() => users.id, { onDelete: "set null" }),
    // Consent snapshot: for minor attendees we persist the specific
    // consent_receipts.id that was active at check-in time. Non-minors
    // and events not gated by program consent leave this NULL. Immutable
    // after insert — gives attendance an auditable link to the exact
    // parental authorization that cleared it.
    consentReceiptId: uuid("consent_receipt_id"),
    // Walk-in method requires an operator-supplied justification string
    // (e.g. "Youth forgot phone — verified by org staff"). Required for
    // method='walk-in', null for other methods.
    walkinJustification: text("walkin_justification"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx: index("attendance_records_session_idx").on(t.sessionId),
    userSessionIdx: uniqueIndex("attendance_records_user_session_idx").on(t.userId, t.sessionId),
    userIdx: index("attendance_records_user_idx").on(t.userId),
  })
);

export const attendancePasses = pgTable(
  "attendance_passes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    passToken: text("pass_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    // Pass kind: 'dynamic' = youth phone pass (rotates every 90s);
    // 'printed' = staff-issued paper pass for no-phone youth, longer
    // TTL, single-use (consumed on first successful check-in).
    kind: text("kind").notNull().default("dynamic"),
    printedAt: timestamp("printed_at", { withTimezone: true }),
    singleUse: boolean("single_use").notNull().default(false),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("attendance_passes_user_idx").on(t.userId, t.active),
    tokenIdx: uniqueIndex("attendance_passes_token_idx").on(t.passToken),
  })
);

export const supportRequests = pgTable(
  "support_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    assignedWorkerId: text("assigned_worker_id"),
    workerNotes: text("worker_notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("support_requests_user_idx").on(t.userId),
    statusIdx: index("support_requests_status_idx").on(t.status),
    createdIdx: index("support_requests_created_idx").on(t.createdAt),
  })
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => programEvents.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("confirmed"),
    consentRequestId: uuid("consent_request_id")
      .references(() => consentRequests.id, { onDelete: "set null" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userEventIdx: uniqueIndex("event_rsvps_user_event_idx").on(t.userId, t.eventId),
    userStatusIdx: index("event_rsvps_user_status_idx").on(t.userId, t.status),
    eventIdx: index("event_rsvps_event_idx").on(t.eventId),
    consentIdx: index("event_rsvps_consent_idx").on(t.consentRequestId),
  })
);

