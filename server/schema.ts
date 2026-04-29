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
  serial,
  decimal,
  time,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Enums
export const weekdayEnum = pgEnum("weekday", [
  "Monday",
  "Tuesday", 
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  dateOfBirth: text("date_of_birth"),
  pinHash: text("pin_hash"),
  loginCode: text("login_code").unique(),
  isMinor: boolean("is_minor").default(false),
  guardianEmail: text("guardian_email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires", { withTimezone: true }),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  passwordResetUsedAt: timestamp("password_reset_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accountLockouts = pgTable("account_lockouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("account_lockouts_email_idx").on(table.email),
}));

export const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array().notNull().default(sql`'{}'`),
  wellnessDimensions: text("wellness_dimensions").array().default(sql`'{}'`),
  free: boolean("free").notNull().default(true),
  dropIn: boolean("drop_in").default(false),
  indoor: boolean("indoor"),
  outdoor: boolean("outdoor"),
  costCents: integer("cost_cents"),
  locationName: text("location_name"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  lat: text("lat"),
  lng: text("lng"),
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  organizer: text("organizer"),
  orgId: uuid("org_id"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  accessibilityNotes: text("accessibility_notes"),
  nextStart: timestamp("next_start", { withTimezone: true }),
  nextEnd: timestamp("next_end", { withTimezone: true }),
  verificationStatus: text("verification_status").default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  staleAt: timestamp("stale_at", { withTimezone: true }),
  sunsetAt: timestamp("sunset_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const savedPrograms = pgTable("saved_programs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.programId] }),
}));

export const rsvps = pgTable("rsvps", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("interested"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.programId] }),
}));

export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  checkinDate: date("checkin_date").notNull(),
  dimension: text("dimension").notNull(),
  moodLevel16: integer("mood_level_1_6").notNull(),
  moodType: text("mood_type"),
  affectTags: text("affect_tags").array().notNull().default(sql`'{}'`),
  wellnessDimensions: text("wellness_dimensions").array().default(sql`'{}'`),
  note: text("note"),
  localTz: text("local_tz"),
  crisisFlags: jsonb("crisis_flags"),
  crisisFlagged: boolean("crisis_flagged").default(false),
  crisisResolvedAt: timestamp("crisis_resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  oneDayIdx: uniqueIndex("checkins_one_per_day_idx").on(table.userId, table.checkinDate),
  userTsIdx: index("checkins_user_ts_idx").on(table.userId, table.timestamp.desc()),
  crisisIdx: index("checkins_crisis_idx").on(table.crisisFlagged, table.timestamp.desc()),
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
  timezone: text("timezone").default("America/Edmonton"),
  
  // Edmonton Ward/Community Assignment
  communityName: text("community_name"),
  wardName: text("ward_name"),
  
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
  
  // Ximi AI preferences
  ximiConsent: boolean("ximi_consent").default(false),
  ximiMode: text("ximi_mode").default("sibling"),
  
  // Mood Orb Accessibility Settings
  highVisibility: boolean("high_visibility").default(false),
  patternOverlay: boolean("pattern_overlay").default(false),
  showColorKey: boolean("show_color_key").default(false),
  
  mood: text("mood"),
  
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
  
  // Guardian contact info (existing fields preserved)
  guardianContactType: text("guardian_contact_type").notNull(),
  guardianContactValue: text("guardian_contact_value").notNull(),
  guardianContactHash: text("guardian_contact_hash").notNull(),
  guardianPhoneNumber: text("guardian_phone_number"),
  guardianPhoneHash: text("guardian_phone_hash"),
  guardianName: text("guardian_name"),
  
  // Original token (legacy, preserved for backward compatibility)
  verificationToken: text("verification_token").notNull(),
  verificationMethod: text("verification_method"),
  pinHash: text("pin_hash"),
  
  // ========== NEW: Two-Step "Email Plus" Consent Flow ==========
  
  // Consent Notice Details (for audit trail)
  consentNoticeVersion: text("consent_notice_version"),
  consentNoticeSentAt: timestamp("consent_notice_sent_at", { withTimezone: true }),
  
  // Step 1: Initial Consent (Parent views page and clicks "I Agree")
  initialConsentToken: text("initial_consent_token").unique(),
  formNonce: text("form_nonce"), // One-time CSRF token for form submission
  initialConsentAt: timestamp("initial_consent_at", { withTimezone: true }),
  initialConsentIp: text("initial_consent_ip"),
  initialConsentUserAgent: text("initial_consent_user_agent"),
  
  // Step 2: Confirmation (Parent clicks link in second email)
  confirmationToken: text("confirmation_token").unique(),
  confirmationSentAt: timestamp("confirmation_sent_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedIp: text("confirmed_ip"),
  confirmedUserAgent: text("confirmed_user_agent"),
  
  // Status: pending_initial_consent -> pending_confirmation -> confirmed -> withdrawn
  status: text("status").default("pending_initial_consent"),
  
  guardianRole: text("guardian_role").default("primary"), // primary, secondary, emergency
  
  // ========== END NEW FIELDS ==========
  
  // Existing verification fields (preserved)
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedByName: text("verified_by_name"),
  verifiedByIp: text("verified_by_ip"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  
  // Consent Withdrawal (new for PIPEDA compliance)
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  withdrawalIp: text("withdrawal_ip"),
  withdrawalUserAgent: text("withdrawal_user_agent"),
}, (table) => ({
  userIdx: index("guardian_verifications_user_idx").on(table.userId),
  tokenIdx: index("guardian_verifications_token_idx").on(table.verificationToken),
  initialTokenIdx: index("guardian_verifications_initial_token_idx").on(table.initialConsentToken),
  confirmationTokenIdx: index("guardian_verifications_confirmation_token_idx").on(table.confirmationToken),
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
  schoolSafeMode: boolean("school_safe_mode").notNull().default(false),
  ximiMode: text("ximi_mode").notNull().default("program_finder"),
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

// TODO: Deprecated - journal_entries table is from legacy companion/journaling feature. Do not delete (migration safety), but do not add new features using this table.
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: integer("mood"),
  moodName: text("mood_name"), // Store mood name (clear, breezy, etc)
  prompt: text("prompt"),
  title: text("title"), // Optional title for entry
  content: text("content"),
  encrypted: boolean("encrypted").default(false),
  encryptedContent: jsonb("encrypted_content"), // {encrypted, iv, authTag}
  ximiConversation: boolean("ximi_conversation").default(false),
  ximiSummary: text("ximi_summary"),
  tags: jsonb("tags"), // Array of tags
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  youthIdx: index("idx_journal_youth").on(table.youthId, table.createdAt.desc()),
  moodIdx: index("idx_journal_mood").on(table.mood, table.createdAt.desc()),
}));

// Youth self-reported demographics — CANONICAL definition is in schema.extras.ts (JSONB answers column).
// This legacy column-based version is kept commented for migration reference only.
// All code imports youthDemographics from schema.extras.ts.

// Guardian's perception of youth demographics
export const guardianPerceptions = pgTable("guardian_perceptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianVerificationId: uuid("guardian_verification_id").notNull().references(() => guardianVerifications.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Guardian's own demographics
  guardianRelationship: text("guardian_relationship"),
  guardianAge: text("guardian_age"),
  guardianGender: text("guardian_gender"),
  guardianRace: text("guardian_race").array().default(sql`'{}'`),
  
  // Guardian's perception of youth
  perceivedSexualOrientation: text("perceived_sexual_orientation"),
  perceivedGenderIdentity: text("perceived_gender_identity"),
  perceivedRacialIdentity: text("perceived_racial_identity").array().default(sql`'{}'`),
  
  // Awareness and comfort levels
  awarenessLevel: text("awareness_level"), // How well they think they know their youth
  comfortWithIdentity: text("comfort_with_identity"), // Comfort level with youth's identity
  supportProvided: text("support_provided").array().default(sql`'{}'`),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  verificationIdx: uniqueIndex("guardian_perceptions_verification_idx").on(table.guardianVerificationId),
  userIdx: index("guardian_perceptions_user_idx").on(table.userId),
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
  parentConsentRequired: boolean("parent_consent_required").default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declinedReason: text("declined_reason"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedReason: text("closed_reason"),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  referredBy: uuid("referred_by"),
  programId: uuid("program_id").references(() => programs.id, { onDelete: "set null" }),
  eventId: uuid("event_id").references(() => programEvents.id, { onDelete: "set null" }),
  notes: text("notes"),
  outcome: text("outcome"),
  outcomeAt: timestamp("outcome_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  fromIdx: index("idx_referrals_from").on(table.fromOrgId, table.status),
  toIdx: index("idx_referrals_to").on(table.toOrgId, table.status),
  youthIdx: index("idx_referrals_youth").on(table.youthId, table.createdAt.desc()),
  referredByIdx: index("idx_referrals_referred_by").on(table.referredBy),
  programIdx: index("idx_referrals_program").on(table.programId),
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

export const emergencyContacts = pgTable("emergency_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("emergency_contacts_user_idx").on(table.userId),
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

// Ximi AI Program Finder
export const ximiConversations = pgTable("ximi_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  checkinId: uuid("checkin_id").references(() => checkins.id, { onDelete: "set null" }),
  mode: text("mode").notNull().default("sibling"),
  userMessage: text("user_message").notNull(),
  ximiResponse: text("ximi_response").notNull(),
  moodContext: text("mood_context"),
  dimensionsContext: text("dimensions_context").array().default(sql`'{}'`),
  crisisDetected: boolean("crisis_detected").default(false),
  crisisKeywords: text("crisis_keywords").array().default(sql`'{}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_ximi_user").on(table.userId, table.createdAt.desc()),
  crisisIdx: index("idx_ximi_crisis").on(table.crisisDetected, table.createdAt.desc()),
}));

// Privacy consent preferences table (Phase 1 upgrade)
export const privacyConsents = pgTable("privacy_consents", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // 5 consent toggles (all default OFF)
  locationSharing: boolean("location_sharing").default(false),
  orbSharing: boolean("orb_sharing").default(false),
  reflectionsSharing: boolean("reflections_sharing").default(false), // TODO: Deprecated field from legacy journaling feature. Kept for migration safety.

  notificationsEnabled: boolean("notifications_enabled").default(false),
  researchParticipation: boolean("research_participation").default(false),
  
  // Monthly reminder settings
  reminderEnabled: boolean("reminder_enabled").default(false),
  lastReminderSent: timestamp("last_reminder_sent"),
  reminderCount: integer("reminder_count").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consent audit log table
export const consentAuditLog = pgTable("consent_audit_log", {
  id: serial("id").primaryKey(),
  userXid: text("user_xid").notNull(),
  consentType: text("consent_type").notNull(),
  action: text("action").notNull(),
  previousValue: boolean("previous_value"),
  newValue: boolean("new_value"),
  source: text("source"),
  ipAddressHash: text("ip_address_hash"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Youth Privacy Settings - controls what parents can see
// This empowers youth to control their own data visibility
export const youthPrivacySettings = pgTable("youth_privacy_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // What parents can see (default: all visible)
  parentCanSeeMood: boolean("parent_can_see_mood").default(true),
  parentCanSeeDemographics: boolean("parent_can_see_demographics").default(false),
  parentCanSeeAttendance: boolean("parent_can_see_attendance").default(true),
  parentCanSeeXimiChats: boolean("parent_can_see_ximi_chats").default(false),
  
  // Programs hidden from parent view (array of program IDs)
  hiddenProgramIds: uuid("hidden_program_ids").array().default(sql`'{}'`),
  
  // Track when youth reviewed their settings
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex("youth_privacy_settings_user_idx").on(table.userId),
}));

// Mature Minor Assessments - documented capacity assessments for legal protection
// Triggered when parent withdraws consent, to document youth's ability to consent independently
export const matureMinorAssessments = pgTable("mature_minor_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Assessment context
  triggeredBy: text("triggered_by").notNull(), // 'consent_withdrawal', 'age_threshold', 'manual'
  guardianVerificationId: uuid("guardian_verification_id").references(() => guardianVerifications.id),
  
  // Assessment questions and responses (stored as JSON for flexibility)
  // Questions assess: understanding of app purpose, consequences, ability to seek help
  responses: jsonb("responses").notNull(),
  
  // Assessment result
  assessmentScore: integer("assessment_score"), // 0-100
  meetsCapacityCriteria: boolean("meets_capacity_criteria").notNull(),
  
  // Legal documentation
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  
  // Staff review (optional)
  staffReviewedBy: uuid("staff_reviewed_by").references(() => users.id),
  staffReviewedAt: timestamp("staff_reviewed_at", { withTimezone: true }),
  staffNotes: text("staff_notes"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("mature_minor_assessments_user_idx").on(table.userId, table.createdAt.desc()),
  triggeredIdx: index("mature_minor_assessments_triggered_idx").on(table.triggeredBy, table.createdAt.desc()),
}));

// Differential privacy metadata table
export const dpApplications = pgTable("dp_applications", {
  id: serial("id").primaryKey(),
  operation: text("operation").notNull(),
  tableName: text("table_name"),
  queryType: text("query_type"),
  originalCount: integer("original_count"),
  noiseAdded: boolean("noise_added").default(true),
  epsilon: decimal("epsilon", { precision: 3, scale: 2 }).default("0.50"),
  mechanism: text("mechanism").default("laplace"),
  suppressed: boolean("suppressed").default(false),
  suppressionReason: text("suppression_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Consent reminders tracking
export const consentReminders = pgTable("consent_reminders", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reminderType: text("reminder_type").default("monthly"),
  sentAt: timestamp("sent_at").defaultNow(),
  responseAt: timestamp("response_at"),
  responseAction: text("response_action"),
});

// Daily quotes table
export const dailyQuotes = pgTable("daily_quotes", {
  id: serial("id").primaryKey(),
  quote: text("quote").notNull(),
  author: text("author"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow(),
});

// T043: weeklyOrbSnapshots table dropped — orb-snapshots route + service were
// retired in T033 (out-of-pilot scope) and the table had zero readers/writers
// for the entire pilot. See server/migrations notes / replit.md for history.

// Mood Drops - moderated mood posts for community sharing
export const moodDrops = pgTable("mood_drops", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(), // cold, stormy, foggy, clear, breezy, aurora
  message: text("message"), // Optional message (max 280 chars)
  isApproved: boolean("is_approved").default(false), // Moderation flag
  isPublic: boolean("is_public").default(false), // Public visibility
  moderatedAt: timestamp("moderated_at"), // When it was moderated
  moderatedBy: uuid("moderated_by").references(() => users.id), // Admin who moderated
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("mood_drops_user_idx").on(table.userId, table.createdAt.desc()),
  publicIdx: index("mood_drops_public_idx").on(table.isPublic, table.createdAt.desc()),
}));

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Encryption key
  auth: text("auth").notNull(), // Authentication secret
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("push_subscriptions_user_idx").on(table.userId),
  userEndpointIdx: uniqueIndex("push_subscriptions_user_endpoint_idx").on(table.userId, table.endpoint),
}));

// ========================================
// PHASE 0-2: Care Navigator Infrastructure
// ========================================

// Track when Ximi recommends programs and user responses
export const recommendationEvents = pgTable("recommendation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  ximiConversationId: uuid("ximi_conversation_id").references(() => ximiConversations.id, { onDelete: "set null" }),
  
  // Recommendation context
  recommendationType: text("recommendation_type").notNull(), // 'proactive_nudge', 'direct_ask', 'crisis_bridge', 'follow_up'
  moodTrend: text("mood_trend"), // 'declining', 'stable_low', 'improving', etc.
  triggerReason: text("trigger_reason"), // Why Ximi recommended this
  matchScore: decimal("match_score", { precision: 3, scale: 2 }), // How well it matched user needs (0-1)
  
  // User response
  userAction: text("user_action"), // 'viewed', 'saved', 'registered', 'dismissed', 'deferred'
  actionTimestamp: timestamp("action_timestamp", { withTimezone: true }),
  userFeedback: text("user_feedback"), // Optional feedback text
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_recommendation_events_user").on(table.userId, table.createdAt.desc()),
  programIdx: index("idx_recommendation_events_program").on(table.programId, table.createdAt.desc()),
  actionIdx: index("idx_recommendation_events_action").on(table.userAction, table.createdAt.desc()),
}));

// Track post-program outcomes and reflections (privacy-safe, anonymized aggregation)
export const outcomeEvents = pgTable("outcome_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  recommendationEventId: uuid("recommendation_event_id").references(() => recommendationEvents.id, { onDelete: "set null" }),
  
  // Attendance tracking
  attended: boolean("attended").notNull(),
  attendanceDate: date("attendance_date"),
  sessionsAttended: integer("sessions_attended").default(1),
  
  // Post-program reflection (collected via Ximi follow-up)
  helpfulnessRating: integer("helpfulness_rating"), // 1-5 scale
  wouldRecommend: boolean("would_recommend"),
  reflectionText: text("reflection_text"), // TODO: Deprecated field name from legacy journaling. Kept for migration safety. This is post-program feedback text.
  moodBefore: text("mood_before"), // Mood type before program
  moodAfter: text("mood_after"), // Mood type after program
  
  // Barriers encountered (for future barrier reduction)
  barriersEncountered: text("barriers_encountered").array().default(sql`'{}'`), // ['transportation', 'cost', 'scheduling', 'social_anxiety']
  barriersResolved: boolean("barriers_resolved").default(false),
  
  // Follow-up metadata
  followUpCount: integer("follow_up_count").default(0),
  lastFollowUpAt: timestamp("last_follow_up_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("idx_outcome_events_user").on(table.userId, table.createdAt.desc()),
  programIdx: index("idx_outcome_events_program").on(table.programId, table.createdAt.desc()),
  attendedIdx: index("idx_outcome_events_attended").on(table.attended, table.programId),
}));

// Provider integration feeds — reserved for Phase 3 real-time provider API integration
// This table will be populated when partner organizations connect their scheduling systems
export const providerFeeds = pgTable("provider_feeds", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  
  // Real-time availability data (when providers integrate)
  spotsAvailable: integer("spots_available"),
  totalCapacity: integer("total_capacity"),
  waitlistLength: integer("waitlist_length"),
  nextSessionDate: timestamp("next_session_date", { withTimezone: true }),
  registrationOpen: boolean("registration_open").default(true),
  
  // Provider metadata
  providerApiKey: text("provider_api_key"), // Hashed API key for verification
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncStatus: text("sync_status").default("pending"), // 'pending', 'active', 'stale', 'error'
  syncErrorMessage: text("sync_error_message"),
  
  // Integration configuration
  webhookUrl: text("webhook_url"),
  pollingInterval: integer("polling_interval").default(3600), // Seconds between polls
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  programIdx: uniqueIndex("idx_provider_feeds_program").on(table.programId),
  syncStatusIdx: index("idx_provider_feeds_sync_status").on(table.syncStatus, table.lastSyncedAt),
}));

// Aggregated peer success insights (anonymized, privacy-safe)
export const peerSuccessInsights = pgTable("peer_success_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  
  // Aggregation period
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // Anonymized metrics (minimum 5 users to preserve k-anonymity)
  totalResponses: integer("total_responses").notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
  recommendationRate: decimal("recommendation_rate", { precision: 3, scale: 2 }), // % who would recommend
  
  // Mood impact (before/after aggregation)
  moodImprovementRate: decimal("mood_improvement_rate", { precision: 3, scale: 2 }),
  commonBarriers: text("common_barriers").array().default(sql`'{}'`),
  
  // Privacy compliance
  differentialPrivacyApplied: boolean("differential_privacy_applied").default(true),
  kAnonymityThreshold: integer("k_anonymity_threshold").default(5),
  suppressed: boolean("suppressed").default(false), // True if < threshold
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  programPeriodIdx: uniqueIndex("idx_peer_success_program_period").on(table.programId, table.periodStart),
  suppressedIdx: index("idx_peer_success_suppressed").on(table.suppressed, table.programId),
}));

// Mood trend summaries (computed daily for longitudinal analysis)
export const moodTrendSummaries = pgTable("mood_trend_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Time window
  windowType: text("window_type").notNull(), // 'week', 'month', 'quarter'
  windowStart: date("window_start").notNull(),
  windowEnd: date("window_end").notNull(),
  
  // Aggregated mood metrics
  averageMoodLevel: decimal("average_mood_level", { precision: 3, scale: 2 }),
  moodVariance: decimal("mood_variance", { precision: 5, scale: 3 }),
  dominantMood: text("dominant_mood"),
  trendDirection: text("trend_direction"), // 'improving', 'stable', 'declining'
  
  // Pattern detection
  consecutiveLowDays: integer("consecutive_low_days").default(0),
  consecutiveHighDays: integer("consecutive_high_days").default(0),
  patternsDetected: text("patterns_detected").array().default(sql`'{}'`), // ['weekend_dip', 'weekly_cycle', etc]
  
  // Wellness dimension correlations
  topWellnessConcerns: text("top_wellness_concerns").array().default(sql`'{}'`),
  wellnessScores: jsonb("wellness_scores"), // {physical: 3.5, emotional: 2.8, etc}
  
  computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userWindowIdx: uniqueIndex("idx_mood_trends_user_window").on(table.userId, table.windowType, table.windowStart),
  trendIdx: index("idx_mood_trends_direction").on(table.trendDirection, table.computedAt.desc()),
}));

// Program events - specific workshops, drop-in sessions, recurring programs
export const programEvents = pgTable("program_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  
  // Event details
  eventName: text("event_name").notNull(),
  description: text("description"),
  
  // Location (denormalized for fast distance sorting)
  locationName: text("location_name"),
  address: text("address"),
  lat: text("lat"), // Denormalized from parent program or event-specific
  lng: text("lng"),
  
  // Schedule - recurring events
  dayOfWeek: weekdayEnum("day_of_week"), // null for one-time events
  startTime: time("start_time").notNull(), // PostgreSQL time type
  endTime: time("end_time").notNull(),
  
  // Schedule - one-time events and seasonal schedules
  occursOnDate: date("occurs_on_date"), // Specific date for one-time events
  effectiveFrom: date("effective_from"), // Start of seasonal schedule
  effectiveTo: date("effective_to"), // End of seasonal schedule
  
  // Event type
  isRecurring: boolean("is_recurring").default(true),
  isDropIn: boolean("is_drop_in").default(false),
  requiresRegistration: boolean("requires_registration").default(false),
  registrationUrl: text("registration_url"),
  registrationDeadline: text("registration_deadline"),
  
  // Capacity and eligibility
  capacity: integer("capacity"),
  ageMin: integer("age_min"),
  ageMax: integer("age_max"),
  
  // Cost
  cost: text("cost"),
  costCents: integer("cost_cents").default(0),
  
  // Additional info
  notes: text("notes"),
  facilitator: text("facilitator"),
  timezone: text("timezone").default("America/Edmonton"),
  
  // Status
  active: boolean("active").default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  programIdx: index("idx_program_events_program").on(table.programId),
  activeTimeIdx: index("idx_program_events_active_time").on(table.active, table.dayOfWeek, table.startTime),
  activeDateIdx: index("idx_program_events_active_date").on(table.active, table.occursOnDate),
}));

// TASK 14: AI Transparency Metrics
export const aiTransparencyMetrics = pgTable("ai_transparency_metrics", {
  date: date("date").primaryKey(),
  totalMessages: integer("total_messages").default(0).notNull(),
  crisisDetected: integer("crisis_detected").default(0).notNull(),
  moderationFlagged: integer("moderation_flagged").default(0).notNull(),
});

// ========== CONSENT-AS-A-SERVICE FOUNDATION ==========
// Enables external organizations to request verified parental consent through Room XI

// Partner Organizations - External orgs that can request consent
export const partnerOrganizations = pgTable("partner_organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Organization info
  name: text("name").notNull(),
  description: text("description"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  website: text("website"),
  
  // Authentication credentials (for API access)
  clientId: text("client_id").notNull().unique(),
  clientSecretHash: text("client_secret_hash").notNull(),
  
  // Status: pending_approval -> approved -> suspended
  status: text("status").default("pending_approval").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
  
  // Allowed consent scopes (what they can request)
  allowedScopes: text("allowed_scopes").array().default(sql`'{}'`),
  
  // Rate limiting
  dailyRequestLimit: integer("daily_request_limit").default(100),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: uniqueIndex("idx_partner_orgs_client_id").on(table.clientId),
  statusIdx: index("idx_partner_orgs_status").on(table.status),
}));

// Consent Delegations - Consent requests from partners
export const consentDelegations = pgTable("consent_delegations", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Links to existing entities
  partnerId: uuid("partner_id").notNull().references(() => partnerOrganizations.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guardianVerificationId: uuid("guardian_verification_id").references(() => guardianVerifications.id),
  
  // Request details
  requestedScopes: text("requested_scopes").array().notNull(), // ['field_trip', 'photo_release', etc]
  purposeDescription: text("purpose_description").notNull(), // What the consent is for
  eventName: text("event_name"), // Specific event/activity name
  eventDate: date("event_date"), // When the activity occurs
  
  // Status: pending -> sent_to_guardian -> approved -> denied -> expired -> withdrawn
  status: text("status").default("pending").notNull(),
  
  // Consent flow
  consentLinkToken: text("consent_link_token").unique(),
  consentLinkSentAt: timestamp("consent_link_sent_at", { withTimezone: true }),
  consentLinkExpiresAt: timestamp("consent_link_expires_at", { withTimezone: true }),
  
  // Guardian decision
  guardianDecision: text("guardian_decision"), // 'approved' | 'denied'
  guardianDecisionAt: timestamp("guardian_decision_at", { withTimezone: true }),
  guardianDecisionIp: text("guardian_decision_ip"),
  guardianDecisionUserAgent: text("guardian_decision_user_agent"),
  guardianNotes: text("guardian_notes"), // Optional notes from guardian
  
  // Consent validity
  consentValidFrom: timestamp("consent_valid_from", { withTimezone: true }),
  consentValidUntil: timestamp("consent_valid_until", { withTimezone: true }),
  
  // Withdrawal
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  withdrawnBy: text("withdrawn_by"), // 'guardian' | 'youth' | 'partner' | 'admin'
  withdrawalReason: text("withdrawal_reason"),
  
  // Metadata for compliance
  consentNoticeVersion: text("consent_notice_version"),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("idx_consent_delegations_partner").on(table.partnerId),
  youthIdx: index("idx_consent_delegations_youth").on(table.youthId),
  statusIdx: index("idx_consent_delegations_status").on(table.status),
  tokenIdx: uniqueIndex("idx_consent_delegations_token").on(table.consentLinkToken),
}));

// Consent Delegation Events - Audit log for delegation actions
export const consentDelegationEvents = pgTable("consent_delegation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  delegationId: uuid("delegation_id").notNull().references(() => consentDelegations.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: text("event_type").notNull(), // 'created', 'sent', 'viewed', 'approved', 'denied', 'expired', 'withdrawn'
  eventData: jsonb("event_data"), // Additional context
  
  // Actor info
  actorType: text("actor_type"), // 'partner', 'guardian', 'youth', 'system', 'admin'
  actorId: text("actor_id"),
  actorIp: text("actor_ip"),
  actorUserAgent: text("actor_user_agent"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  delegationIdx: index("idx_consent_delegation_events_delegation").on(table.delegationId),
  eventTypeIdx: index("idx_consent_delegation_events_type").on(table.eventType),
}));

// Safety Plans - Personal safety plans for youth
export const safetyPlans = pgTable("safety_plans", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  
  // Plan data stored as JSONB with 7 sections
  planData: jsonb("plan_data").notNull().default(sql`'{
    "warningSigns": [],
    "copingSteps": [],
    "safePlaces": [],
    "trustedContacts": [],
    "professionalSupport": [],
    "escalationSteps": [],
    "notesForOthers": {"helps": "", "notHelpful": "", "supportNotes": ""}
  }'::jsonb`),
  
  // Version tracking
  planVersion: integer("plan_version").notNull().default(1),
  
  // Review tracking
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  
  // Consent linkage
  consentVersion: text("consent_version"),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  updatedIdx: index("safety_plans_updated_idx").on(table.updatedAt.desc()),
}));

// Safety Plan Shares - Secure share tokens for read-only access
export const safetyPlanShares = pgTable("safety_plan_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owner reference
  planUserId: uuid("plan_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Token security - store hash only
  tokenHash: text("token_hash").notNull().unique(),
  
  // Expiration and revocation
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  
  // Optional label for identifying shares
  label: text("label"),
  
  // Access tracking
  accessCount: integer("access_count").notNull().default(0),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  planUserIdx: index("safety_plan_shares_plan_user_idx").on(table.planUserId),
  tokenHashIdx: uniqueIndex("safety_plan_shares_token_hash_idx").on(table.tokenHash),
  expiresIdx: index("safety_plan_shares_expires_idx").on(table.expiresAt),
}));

// Safety Plan Events - Audit log for safety plan actions
export const safetyPlanEvents = pgTable("safety_plan_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Event details
  eventType: text("event_type").notNull(), // 'created', 'updated', 'share_created', 'share_revoked', 'share_accessed', 'deleted'
  eventData: jsonb("event_data"),
  
  // Actor info for share access
  actorIp: text("actor_ip"),
  actorUserAgent: text("actor_user_agent"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("safety_plan_events_user_idx").on(table.userId),
  eventTypeIdx: index("safety_plan_events_type_idx").on(table.eventType),
}));

// Sentiment Analyses - NLP sentiment/emotion metadata for check-ins
export const sentimentAnalyses = pgTable("sentiment_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // 'checkin' | 'journal'
  sourceId: uuid("source_id").notNull(),
  sentimentLabel: text("sentiment_label").notNull().default("unknown"), // positive, neutral, negative, mixed, unknown
  sentimentScore: numeric("sentiment_score"), // -1 to 1
  emotions: jsonb("emotions"), // { primary: string, secondary?: string[] }
  themes: text("themes").array().notNull().default(sql`'{}'`),
  confidence: numeric("confidence"), // 0 to 1
  crisisFlagged: boolean("crisis_flagged").notNull().default(false),
  crisisFlags: jsonb("crisis_flags"), // { guardian: boolean, llm: object, redactions: object }
  model: text("model"), // e.g. 'gpt-4o-mini'
  raw: jsonb("raw"), // full LLM response for debugging
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("sentiment_analyses_user_idx").on(table.userId),
  sourceIdx: index("sentiment_analyses_source_idx").on(table.sourceType, table.sourceId),
  createdIdx: index("sentiment_analyses_created_idx").on(table.createdAt),
  uniqueSource: uniqueIndex("sentiment_analyses_unique_source").on(table.userId, table.sourceType, table.sourceId),
}));

export const crisisEscalations = pgTable("crisis_escalations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // 'checkin' | 'ximi_chat' | 'journal'
  sourceId: uuid("source_id").notNull(),
  recipientType: text("recipient_type").notNull(), // 'guardian' | 'emergency_contact' | 'admin'
  recipientId: uuid("recipient_id"), // FK to guardians, emergency_contacts, or admin users
  recipientEmailHash: text("recipient_email_hash"), // SHA256 hash of email for audit (privacy-preserving)
  channel: text("channel").notNull(), // 'email' | 'push' | 'sms'
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'failed' | 'delivered'
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  providerMessageId: text("provider_message_id"), // For tracking delivery status
  meta: jsonb("meta"), // additional context (no PII content)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("crisis_escalations_user_idx").on(table.userId, table.attemptedAt.desc()),
  sourceIdx: index("crisis_escalations_source_idx").on(table.sourceType, table.sourceId),
  statusIdx: index("crisis_escalations_status_idx").on(table.status, table.attemptedAt.desc()),
}));

export const crisisFollowups = pgTable("crisis_followups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  escalationId: uuid("escalation_id").notNull().references(() => crisisEscalations.id, { onDelete: "cascade" }),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'sent' | 'completed' | 'cancelled'
  followupType: text("followup_type").notNull().default("ximi_message"), // 'ximi_message' | 'push_notification'
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userScheduledIdx: index("crisis_followups_user_scheduled_idx").on(table.userId, table.scheduledFor),
  statusIdx: index("crisis_followups_status_idx").on(table.status, table.scheduledFor),
}));

// XiP Points - User totals and streaks for gamification
export const xipPoints = pgTable("xip_points", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  totalPoints: integer("total_points").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActivityDate: date("last_activity_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: uniqueIndex("xip_points_user_idx").on(table.userId),
}));

// XiP Activities - Point history log
export const xipActivities = pgTable("xip_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // 'mood_checkin', 'program_attendance', 'profile_complete', 'streak_bonus_7', 'streak_bonus_30'
  pointsAwarded: integer("points_awarded").notNull(),
  metadata: jsonb("metadata"), // Additional context like program name
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("xip_activities_user_idx").on(table.userId, table.createdAt.desc()),
  typeIdx: index("xip_activities_type_idx").on(table.activityType),
}));

// XiP Rewards - Available rewards catalog
export const xipRewards = pgTable("xip_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  pointCost: integer("point_cost").notNull(),
  category: text("category").notNull(), // 'digital', 'physical', 'experience'
  imageUrl: text("image_url"),
  quantityAvailable: integer("quantity_available"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// XiP Reward Claims - User reward claims
export const xipRewardClaims = pgTable("xip_reward_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rewardId: uuid("reward_id").notNull().references(() => xipRewards.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(), // 'pending', 'fulfilled', 'cancelled'
  claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
  fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
}, (table) => ({
  userIdx: index("xip_reward_claims_user_idx").on(table.userId, table.claimedAt.desc()),
  statusIdx: index("xip_reward_claims_status_idx").on(table.status),
}));

// ========================================
// Tournament + Attribution + Notifications
// ========================================

export const userAttribution = pgTable("user_attribution", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").references(() => organizations.id),
  campaign: text("campaign"),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgCampaignIdx: index("user_attribution_org_campaign_idx").on(table.orgId, table.campaign, table.createdAt),
  userIdx: index("user_attribution_user_idx").on(table.userId),
}));

export const userOrgAffiliations = pgTable("user_org_affiliations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("participant"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex("user_org_affiliations_user_org_idx").on(table.userId, table.orgId),
}));

// T043: tournaments + tournament_{teams,team_members,invites,registrations,
// games,standings} dropped. The /api/tournaments router has been 410'd via
// PILOT_DISABLED_API_PREFIXES since T024; the only remaining writers were in
// server/seed-demo.js (manual demo seed) and were removed alongside the tables.

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  scopeType: text("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  scopeIdx: index("announcements_scope_idx").on(table.scopeType, table.scopeId, table.createdAt.desc()),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title"),
  payload: jsonb("payload"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userReadIdx: index("notifications_user_read_idx").on(table.userId, table.readAt, table.createdAt.desc()),
}));

export const importJobs = pgTable("import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  status: text("status").notNull().default("pending"),
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  successCount: integer("success_count").default(0),
  errorCount: integer("error_count").default(0),
  errors: jsonb("errors"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  orgIdx: index("import_jobs_org_idx").on(table.orgId, table.createdAt.desc()),
  statusIdx: index("import_jobs_status_idx").on(table.status),
}));

export const listingVerifications = pgTable("listing_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  changeRequested: text("change_requested"),
  importJobId: uuid("import_job_id").references(() => importJobs.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => ({
  orgStatusIdx: index("listing_verifications_org_status_idx").on(table.orgId, table.status),
  programIdx: index("listing_verifications_program_idx").on(table.programId),
}));

export const featureFlags = pgTable('feature_flags', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  orgId: uuid('org_id').references(() => organizations.id),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const reportRuns = pgTable("report_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  runBy: uuid("run_by").notNull(),
  reportType: text("report_type").notNull(),
  parameters: jsonb("parameters"),
  status: text("status").notNull().default("running"),
  rowCount: integer("row_count"),
  error: text("error"),
  fileContent: text("file_content"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgCreatedIdx: index("report_runs_org_created_idx").on(table.orgId, table.createdAt.desc()),
}));
