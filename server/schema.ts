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
  guardianContactType: text("guardian_contact_type").notNull(),
  guardianContactValue: text("guardian_contact_value").notNull(),
  guardianContactHash: text("guardian_contact_hash").notNull(),
  verificationToken: text("verification_token").notNull(),
  verificationMethod: text("verification_method"),
  pinHash: text("pin_hash"),
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

// Ximi AI Companion
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
  reflectionsSharing: boolean("reflections_sharing").default(false),
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

// Weekly Orb Snapshots - captures mood orb state every Sunday at 08:00 America/Edmonton
export const weeklyOrbSnapshots = pgTable("weekly_orb_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  snapshotDate: date("snapshot_date").notNull(), // Date of the Sunday snapshot
  weekStartDate: date("week_start_date").notNull(), // Monday of the week
  weekEndDate: date("week_end_date").notNull(), // Sunday of the week
  
  // Mood ratios for the week (0.0 to 1.0)
  coldRatio: decimal("cold_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  stormyRatio: decimal("stormy_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  foggyRatio: decimal("foggy_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  clearRatio: decimal("clear_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  breezyRatio: decimal("breezy_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  auroraRatio: decimal("aurora_ratio", { precision: 4, scale: 3 }).notNull().default('0.000'),
  
  // Dominant mood and statistics
  dominantMood: text("dominant_mood").notNull(), // The most common mood
  totalCheckIns: integer("total_check_ins").notNull().default(0),
  averageMoodLevel: decimal("average_mood_level", { precision: 3, scale: 2 }), // 1.00 to 6.00
  
  // Visual snapshot data (JSON blob for rendering)
  visualData: jsonb("visual_data"), // Store color values, gradients, etc.
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userDateIdx: uniqueIndex("weekly_orb_snapshots_user_date_idx").on(table.userId, table.snapshotDate),
  userIdx: index("weekly_orb_snapshots_user_idx").on(table.userId, table.createdAt.desc()),
  dateIdx: index("weekly_orb_snapshots_date_idx").on(table.snapshotDate.desc()),
}));

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
  reflectionText: text("reflection_text"), // Open-ended feedback
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

// Provider integration feeds (stub for future real-time data)
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
