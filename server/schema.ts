import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  date,
  jsonb,
  bigint,
  numeric,
  index,
  uniqueIndex,
  primaryKey,
  check,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  free: boolean("free").notNull().default(true),
  indoor: boolean("indoor"),
  outdoor: boolean("outdoor"),
  costCents: integer("cost_cents"),
  locationName: text("location_name"),
  address: text("address"),
  lat: text("lat"),
  lng: text("lng"),
  organizer: text("organizer"),
  accessibilityNotes: text("accessibility_notes"),
  nextStart: timestamp("next_start", { withTimezone: true }),
  nextEnd: timestamp("next_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const savedPrograms = pgTable("saved_programs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.programId] }),
}));

export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  dimension: text("dimension").notNull(),
  moodLevel16: integer("mood_level_1_6").notNull(),
  affectTags: text("affect_tags").array().notNull().default(sql`'{}'`),
  note: text("note"),
  localTz: text("local_tz"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userTsIdx: index("checkins_user_ts_idx").on(table.userId, table.timestamp.desc()),
}));

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  weights: jsonb("weights"),
  scores: jsonb("scores"),
  streakCount: integer("streak_count").default(0),
  lastCheckinDate: date("last_checkin_date"),
  isAdmin: boolean("is_admin").notNull().default(false),
  
  // Layer 1: Basic Info
  firstName: text("first_name"),
  lastName: text("last_name"),
  preferredName: text("preferred_name"),
  age: integer("age"),
  dateOfBirth: date("date_of_birth"),
  city: text("city"),
  postalCode: text("postal_code"),
  
  // Layer 2: Safety Profile
  legalFirstName: text("legal_first_name"),
  legalLastName: text("legal_last_name"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  
  // Indigenous Self-Identification
  indigenousIdentity: text("indigenous_identity"),
  indigenousCommunity: text("indigenous_community"),
  
  // Progress Tracking
  accountComplete: boolean("account_complete").default(false),
  safetyProfileComplete: boolean("safety_profile_complete").default(false),
  programProfileComplete: boolean("program_profile_complete").default(false),
  
  // XP system
  xpPoints: integer("xp_points").default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const xids = pgTable("xids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  xidHash: text("xid_hash").notNull().unique(),
  checksum: text("checksum"),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  xidId: uuid("xid_id").notNull().references(() => xids.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  method: text("method").notNull(),
  site: text("site"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  xidTsIdx: index("attendance_xid_ts_idx").on(table.xidId, table.timestamp.desc()),
}));

export const guardianVerifications = pgTable("guardian_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guardianContactType: text("guardian_contact_type").notNull(),
  guardianContactValue: text("guardian_contact_value").notNull(),
  guardianContactHash: text("guardian_contact_hash").notNull(),
  verificationToken: text("verification_token").notNull(),
  verificationMethod: text("verification_method"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedByName: text("verified_by_name"),
  verifiedByIp: text("verified_by_ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("guardian_verifications_user_idx").on(table.userId),
  tokenIdx: index("guardian_verifications_token_idx").on(table.verificationToken),
}));

export const consents = pgTable("consents", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(),
  value: boolean("value").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  grantedBy: text("granted_by"),
  evidenceRef: text("evidence_ref"),
  textVersion: text("text_version"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.consentType] }),
}));

export const healthProfiles = pgTable("health_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  accessibilityNeeds: text("accessibility_needs"),
  dietaryRestrictions: text("dietary_restrictions"),
  parqStatus: text("parq_status"),
  parqCompletedAt: timestamp("parq_completed_at", { withTimezone: true }),
  
  healthDataConsent: boolean("health_data_consent").notNull().default(false),
  healthConsentGrantedAt: timestamp("health_consent_granted_at", { withTimezone: true }),
  healthConsentIp: text("health_consent_ip"),
  healthConsentUserAgent: text("health_consent_user_agent"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const consentEvents = pgTable("consent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(),
  eventType: text("event_type").notNull(),
  consentKey: text("consent_key"),
  oldValue: boolean("old_value"),
  newValue: boolean("new_value"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  evidenceRef: text("evidence_ref"),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("consent_events_user_idx").on(table.userId, table.occurredAt.desc()),
}));

export const breachEvents = pgTable("breach_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  breachType: text("breach_type").notNull(),
  severity: text("severity").notNull(),
  affectedUserCount: integer("affected_user_count"),
  affectedUserIds: uuid("affected_user_ids").array(),
  description: text("description").notNull(),
  
  oipcNotificationRequired: boolean("oipc_notification_required").notNull().default(false),
  oipcNotifiedAt: timestamp("oipc_notified_at", { withTimezone: true }),
  oipcNotificationMethod: text("oipc_notification_method"),
  oipcReferenceNumber: text("oipc_reference_number"),
  
  individualsNotifiedAt: timestamp("individuals_notified_at", { withTimezone: true }),
  notificationMethod: text("notification_method"),
  guardiansNotifiedAt: timestamp("guardians_notified_at", { withTimezone: true }),
  
  remediationSteps: text("remediation_steps"),
  remediationCompletedAt: timestamp("remediation_completed_at", { withTimezone: true }),
  
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  discoveredIdx: index("breach_events_discovered_idx").on(table.discoveredAt.desc()),
}));

export const crisisSupports = pgTable("crisis_supports", {
  id: uuid("id").primaryKey().defaultRandom(),
  region: text("region").notNull(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  textCode: text("text_code"),
  chatUrl: text("chat_url"),
  address: text("address"),
  hours: text("hours"),
  notes: text("notes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adminLogs = pgTable("admin_logs", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").references(() => users.id),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  oldRecord: jsonb("old_record"),
  newRecord: jsonb("new_record"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// Multi-org expansion tables
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: jsonb("address"),
  website: text("website"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  activeIdx: index("idx_organizations_active").on(table.active, table.name),
}));

export const orgMembers = pgTable("org_members", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  permissions: jsonb("permissions").default(sql`'{"view_referrals": true, "create_referrals": false, "manage_programs": false}'`),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.orgId] }),
  userIdx: index("idx_org_members_user").on(table.userId),
  orgIdx: index("idx_org_members_org").on(table.orgId, table.role),
}));

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: integer("mood"),
  prompt: text("prompt"),
  content: text("content"),
  ximiConversation: boolean("ximi_conversation").default(false),
  ximiSummary: text("ximi_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  youthIdx: index("idx_journal_youth").on(table.youthId, table.createdAt.desc()),
}));

export const copingSkills = pgTable("coping_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  steps: text("steps").array().notNull(),
  durationMinutes: integer("duration_minutes"),
  difficulty: text("difficulty"),
  tags: text("tags").array().default(sql`'{}'`),
  culturallyAdapted: boolean("culturally_adapted").default(false),
  culturalNotes: text("cultural_notes"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("idx_coping_skills_category").on(table.category, table.active),
}));

export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromOrgId: uuid("from_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  toOrgId: uuid("to_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary"),
  priority: text("priority").default("medium"),
  status: text("status").notNull().default("pending_consent"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declinedReason: text("declined_reason"),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  fromIdx: index("idx_referrals_from").on(table.fromOrgId, table.status),
  toIdx: index("idx_referrals_to").on(table.toOrgId, table.status),
  youthIdx: index("idx_referrals_youth").on(table.youthId, table.createdAt.desc()),
}));

export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteEncrypted: jsonb("note_encrypted").notNull(),
  category: text("category"),
  tags: text("tags").array().default(sql`'{}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgYouthIdx: index("idx_case_notes_org_youth").on(table.orgId, table.youthId, table.createdAt.desc()),
  authorIdx: index("idx_case_notes_author").on(table.authorUserId, table.createdAt.desc()),
}));

export const programOutcomes = pgTable("program_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  metric: text("metric").notNull(),
  value: numeric("value").notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  programIdx: index("idx_program_outcomes_program").on(table.programId, table.metric, table.recordedAt.desc()),
}));

export const auditTrail = pgTable("audit_trail", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id").references(() => users.id),
  orgId: uuid("org_id").references(() => organizations.id),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  recordData: jsonb("record_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  result: text("result"),
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
}, (table) => ({
  timestampIdx: index("idx_audit_trail_timestamp").on(table.timestamp.desc()),
  userIdx: index("idx_audit_trail_user").on(table.userId, table.timestamp.desc()),
  tableIdx: index("idx_audit_trail_table").on(table.tableName, table.timestamp.desc()),
  actionIdx: index("idx_audit_trail_action").on(table.action, table.result, table.timestamp.desc()),
}));
