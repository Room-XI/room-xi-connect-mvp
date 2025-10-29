# Room XI Connect - Complete Build Documentation

**Version:** 1.0.0  
**Last Updated:** October 29, 2025  
**Architecture:** Express.js + React + Drizzle ORM + PostgreSQL (Neon)

This document contains **everything** about Room XI Connect: database schemas, wireframes, source code, API documentation, and implementation details.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Complete Database Schema](#complete-database-schema)
4. [Screen Wireframes & User Flows](#screen-wireframes--user-flows)
5. [Backend Source Code](#backend-source-code)
6. [Frontend Source Code](#frontend-source-code)
7. [API Reference](#api-reference)
8. [Data Flow Diagrams](#data-flow-diagrams)
9. [Authentication & Security](#authentication--security)
10. [Privacy & Compliance](#privacy--compliance)
11. [Setup & Deployment](#setup--deployment)

---

## Project Overview

### Mission
Room XI Connect is a youth mental health and wellness platform for ages 13-25, helping young people feel seen, build capacity, and find community through daily check-ins, program discovery, and crisis support.

### Core Features
- **Daily Mood Check-ins**: Interactive mood tracking with the "Mood Orb"
- **Program Discovery**: Browse local programs (no login required)
- **Crisis Support**: 24/7 access to mental health resources
- **QR Code Attendance**: Privacy-preserving program check-ins
- **Offline Support**: Works without internet, syncs when online
- **PIPA & HIA Compliant**: Alberta privacy legislation compliance

### Key Principles
- **Privacy-First**: Non-identifying XIDs for attendance
- **Trauma-Informed**: Safe, non-judgmental design
- **Accessible**: WCAG 2.1 AA compliant
- **Youth-Centered**: Built for and with youth voices

---

## Technology Stack

### Backend
```
Express.js 5.1        - HTTP server
Drizzle ORM 0.44      - Type-safe database queries
PostgreSQL (Neon)     - Database
bcrypt 6.0            - Password hashing
express-session 1.18  - Session management
connect-pg-simple 10  - PostgreSQL session store
tsx 4.20              - TypeScript execution
```

### Frontend
```
React 18.2            - UI framework
TypeScript 5.6        - Type safety
Vite 5.4              - Build tool
React Router 6.23     - Client-side routing
Tailwind CSS 3.4      - Styling
Framer Motion 11      - Animations
Leaflet 1.9           - Interactive maps
Recharts 2.12         - Data visualization
@zxing/browser 0.1    - QR code scanning
idb 7.1               - IndexedDB wrapper
```

### Development Tools
```
Drizzle Kit 0.31      - Database migrations
Vitest 1.6            - Testing framework
vite-plugin-pwa 0.20  - PWA support
```

---

## Complete Database Schema

Full Drizzle ORM schema from `server/schema.ts`:

```typescript
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

// ========================================
// CORE TABLES
// ========================================

/** Users - Authentication & Credentials */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Programs - Youth Activities & Services */
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

/** Saved Programs - User Bookmarks */
export const savedPrograms = pgTable("saved_programs", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.programId] }),
}));

/** Check-ins - Daily Mood Tracking */
export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  checkinDate: date("checkin_date").notNull(),
  dimension: text("dimension").notNull(),
  moodLevel16: integer("mood_level_1_6").notNull(),
  affectTags: text("affect_tags").array().notNull().default(sql`'{}'`),
  note: text("note"),
  localTz: text("local_tz"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Enforce one check-in per day per user
  oneDayIdx: uniqueIndex("checkins_one_per_day_idx").on(table.userId, table.checkinDate),
  userTsIdx: index("checkins_user_ts_idx").on(table.userId, table.timestamp.desc()),
}));

/** Profiles - Extended User Data */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  weights: jsonb("weights"),
  scores: jsonb("scores"),
  streakCount: integer("streak_count").default(0),
  lastCheckinDate: date("last_checkin_date"),
  isAdmin: boolean("is_admin").notNull().default(false),
  
  // Layer 1: Basic Info (Account Creation)
  firstName: text("first_name"),
  lastName: text("last_name"),
  preferredName: text("preferred_name"),
  age: integer("age"),
  dateOfBirth: date("date_of_birth"),
  city: text("city"),
  postalCode: text("postal_code"),
  
  // Layer 2: Safety Profile (Before Programs)
  legalFirstName: text("legal_first_name"),
  legalLastName: text("legal_last_name"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
  
  // Indigenous Self-Identification (OCAP Principles)
  indigenousIdentity: text("indigenous_identity"),
  indigenousCommunity: text("indigenous_community"),
  
  // Progress Tracking
  accountComplete: boolean("account_complete").default(false),
  safetyProfileComplete: boolean("safety_profile_complete").default(false),
  programProfileComplete: boolean("program_profile_complete").default(false),
  
  // XP Gamification System
  xpPoints: integer("xp_points").default(0),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ========================================
// PRIVACY & ATTENDANCE
// ========================================

/** XIDs - Privacy-Preserving Identifiers */
export const xids = pgTable("xids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  xidHash: text("xid_hash").notNull().unique(),
  checksum: text("checksum"),
  tombstonedAt: timestamp("tombstoned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Attendance - QR Code Check-ins */
export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  xidId: uuid("xid_id").notNull().references(() => xids.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  method: text("method").notNull(), // 'qr', 'manual', 'nfc'
  site: text("site"), // Location of check-in
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  xidTsIdx: index("attendance_xid_ts_idx").on(table.xidId, table.timestamp.desc()),
}));

// ========================================
// COMPLIANCE & CONSENT (PIPA/HIA)
// ========================================

/** Guardian Verifications - Parental Consent */
export const guardianVerifications = pgTable("guardian_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  guardianContactType: text("guardian_contact_type").notNull(), // 'email', 'phone', 'alberta_digital_id'
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

/** Consents - Granular Consent Tracking */
export const consents = pgTable("consents", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentType: text("consent_type").notNull(), 
  // Types: terms_of_use, privacy_notice, data_collection, 
  //        photo_internal, photo_social_media, photo_website, photo_fundraising, photo_story
  //        analytics_opt_in, ai_personalization, crash_reporting
  value: boolean("value").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  grantedBy: text("granted_by"), // 'self', 'guardian', 'admin'
  evidenceRef: text("evidence_ref"), // Reference to consent form/recording
  textVersion: text("text_version"), // Version of legal text accepted
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.consentType] }),
}));

/** Health Profiles - HIA-Compliant Health Data */
export const healthProfiles = pgTable("health_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  accessibilityNeeds: text("accessibility_needs"),
  dietaryRestrictions: text("dietary_restrictions"),
  parqStatus: text("parq_status"), // Physical Activity Readiness Questionnaire
  parqCompletedAt: timestamp("parq_completed_at", { withTimezone: true }),
  
  // Separate HIA-Compliant Consent
  healthDataConsent: boolean("health_data_consent").notNull().default(false),
  healthConsentGrantedAt: timestamp("health_consent_granted_at", { withTimezone: true }),
  healthConsentIp: text("health_consent_ip"),
  healthConsentUserAgent: text("health_consent_user_agent"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Consent Events - Audit Trail */
export const consentEvents = pgTable("consent_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(), // 'self', 'guardian', 'admin'
  eventType: text("event_type").notNull(), // 'granted', 'revoked', 'updated'
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

/** Breach Events - Privacy Breach Tracking (PIPA Requirement) */
export const breachEvents = pgTable("breach_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  breachType: text("breach_type").notNull(), // 'unauthorized_access', 'data_leak', 'system_compromise'
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  affectedUserCount: integer("affected_user_count"),
  affectedUserIds: uuid("affected_user_ids").array(),
  description: text("description").notNull(),
  
  // OIPC Notification (72-hour requirement)
  oipcNotificationRequired: boolean("oipc_notification_required").notNull().default(false),
  oipcNotifiedAt: timestamp("oipc_notified_at", { withTimezone: true }),
  oipcNotificationMethod: text("oipc_notification_method"),
  oipcReferenceNumber: text("oipc_reference_number"),
  
  // Individual Notifications
  individualsNotifiedAt: timestamp("individuals_notified_at", { withTimezone: true }),
  notificationMethod: text("notification_method"),
  guardiansNotifiedAt: timestamp("guardians_notified_at", { withTimezone: true }),
  
  // Remediation
  remediationSteps: text("remediation_steps"),
  remediationCompletedAt: timestamp("remediation_completed_at", { withTimezone: true }),
  
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  discoveredIdx: index("breach_events_discovered_idx").on(table.discoveredAt.desc()),
}));

// ========================================
// CRISIS SUPPORT
// ========================================

/** Crisis Supports - Mental Health Resources */
export const crisisSupports = pgTable("crisis_supports", {
  id: uuid("id").primaryKey().defaultRandom(),
  region: text("region").notNull(), // 'alberta', 'canada', 'indigenous'
  category: text("category").notNull(), // 'phone', 'text', 'chat', 'local'
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

// ========================================
// ADMIN & LOGGING
// ========================================

/** Admin Logs - Administrative Actions */
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

// ========================================
// MULTI-ORG EXPANSION (v2.0 Features)
// ========================================

/** Organizations - Service Providers */
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'school', 'community_center', 'nonprofit', 'health_service'
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

/** Org Members - Staff/Youth Workers */
export const orgMembers = pgTable("org_members", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'admin', 'youth_worker', 'volunteer'
  permissions: jsonb("permissions").default(sql`'{"view_referrals": true, "create_referrals": false, "manage_programs": false}'`),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.orgId] }),
  userIdx: index("idx_org_members_user").on(table.userId),
  orgIdx: index("idx_org_members_org").on(table.orgId, table.role),
}));

/** Journal Entries - Extended Check-ins */
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

/** Coping Skills - Evidence-Based Strategies */
export const copingSkills = pgTable("coping_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: text("category").notNull(), // 'breathing', 'grounding', 'movement', 'creative'
  title: text("title").notNull(),
  description: text("description"),
  steps: text("steps").array().notNull(),
  durationMinutes: integer("duration_minutes"),
  difficulty: text("difficulty"), // 'easy', 'medium', 'advanced'
  tags: text("tags").array().default(sql`'{}'`),
  culturallyAdapted: boolean("culturally_adapted").default(false),
  culturalNotes: text("cultural_notes"),
  active: boolean("active").notNull().default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("idx_coping_skills_category").on(table.category, table.active),
}));

/** Referrals - Warm Handoffs Between Orgs */
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromOrgId: uuid("from_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  toOrgId: uuid("to_org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary"),
  priority: text("priority").default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default("pending_consent"), // 'pending_consent', 'sent', 'accepted', 'declined'
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

/** Case Notes - Encrypted Staff Notes */
export const caseNotes = pgTable("case_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  noteEncrypted: jsonb("note_encrypted").notNull(), // Encrypted note data
  category: text("category"),
  tags: text("tags").array().default(sql`'{}'`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgYouthIdx: index("idx_case_notes_org_youth").on(table.orgId, table.youthId, table.createdAt.desc()),
  authorIdx: index("idx_case_notes_author").on(table.authorUserId, table.createdAt.desc()),
}));

/** Program Outcomes - Impact Tracking */
export const programOutcomes = pgTable("program_outcomes", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  metric: text("metric").notNull(), // 'attendance_rate', 'satisfaction', 'retention'
  value: numeric("value").notNull(),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  programIdx: index("idx_program_outcomes_program").on(table.programId, table.metric, table.recordedAt.desc()),
}));

/** Audit Trail - Complete System Audit Log */
export const auditTrail = pgTable("audit_trail", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  userId: uuid("user_id").references(() => users.id),
  orgId: uuid("org_id").references(() => organizations.id),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'access'
  tableName: text("table_name").notNull(),
  recordId: uuid("record_id"),
  recordData: jsonb("record_data"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  result: text("result"), // 'success', 'failure', 'partial'
  errorMessage: text("error_message"),
  durationMs: integer("duration_ms"),
}, (table) => ({
  timestampIdx: index("idx_audit_trail_timestamp").on(table.timestamp.desc()),
  userIdx: index("idx_audit_trail_user").on(table.userId, table.timestamp.desc()),
  tableIdx: index("idx_audit_trail_table").on(table.tableName, table.timestamp.desc()),
  actionIdx: index("idx_audit_trail_action").on(table.action, table.result, table.timestamp.desc()),
}));
```

### Table Relationships

```
users (1) ─── (1) profiles
  │
  ├─── (1) xids ─── (*) attendance ─── (*) programs
  │
  ├─── (*) checkins
  ├─── (*) saved_programs ─── (*) programs
  ├─── (*) guardian_verifications
  ├─── (*) consents
  ├─── (1) health_profiles
  ├─── (*) consent_events
  ├─── (*) journal_entries
  ├─── (*) org_members ─── (*) organizations
  └─── (*) referrals
        ├─── from_org (organizations)
        └─── to_org (organizations)

programs (1) ─── (*) attendance
         ├─── (*) saved_programs
         └─── (*) program_outcomes

organizations (1) ─── (*) org_members
              ├─── (*) referrals (from)
              ├─── (*) referrals (to)
              └─── (*) case_notes
```

---

## Screen Wireframes & User Flows

### Guest User Journey

```
┌─────────────────────────────────────────┐
│         Landing Page (/auth/login)      │
│                                         │
│    Room 11 Foundation    [Donate ❤️]   │
│    "Your space. Your vibe. Your people."│
│                                         │
│    ┌───────────────┐  ┌──────────────┐ │
│    │ Explore       │  │ Sign In      │ │
│    │ Programs      │  │              │ │
│    └───────────────┘  └──────────────┘ │
│                                         │
│    What We Do:                          │
│    • Find Programs                      │
│    • Track Your Journey                 │
│    • Get Help                           │
│                                         │
│    [Learn More about Room 11] →         │
└─────────────────────────────────────────┘
         │
         ├─── Click "Explore Programs"
         │
         ▼
┌─────────────────────────────────────────┐
│      Program Browser (/explore)         │
│                                         │
│    🔍 Search programs...                │
│    [List] [Map] [Saved]                 │
│    ┌─────────────────────────────────┐ │
│    │ Basketball Skills Development   │ │
│    │ by OTB Basketball               │ │
│    │ 📍 Allendale Community          │ │
│    │ 🆓 Free                         │ │
│    │                     [❤️ Save]   │ │← Login required
│    └─────────────────────────────────┘ │
│    ┌─────────────────────────────────┐ │
│    │ Art & Self-Expression Workshop  │ │
│    │ by CanManDan                    │ │
│    │ ...                             │ │
│    └─────────────────────────────────┘ │
│                                         │
│    [Explore] [Sign In]                  │← Bottom nav (guest)
└─────────────────────────────────────────┘
         │
         ├─── Click program card
         │
         ▼
┌─────────────────────────────────────────┐
│   Program Detail (/program/:id)         │
│                                         │
│    [← Back]              [Share] [❤️]  │
│    ─────────────────────────────────────│
│    Basketball Skills Development        │
│    by OTB Basketball                    │
│                                         │
│    📍 Allendale Community League        │
│    🕐 Fridays, 6-8 PM                   │
│    🆓 Free                              │
│    🏠 Indoor                            │
│    ♿ Wheelchair accessible             │
│    ─────────────────────────────────────│
│    About this program:                  │
│    Learn fundamental basketball skills  │
│    in a supportive, trauma-informed...  │
│                                         │
│    Tags:                                │
│    [Sports] [Team] [All Ages]          │
│    ─────────────────────────────────────│
│    [Get Directions] [Save Program]     │
└─────────────────────────────────────────┘
```

### Authenticated User Journey

```
┌─────────────────────────────────────────┐
│         Home Dashboard (/home)          │
│                                         │
│    Good morning, Alex! 👋               │
│    Streak: 5 days 🔥                    │
│    ─────────────────────────────────────│
│            ┌──────────┐                 │
│            │  Mood    │                 │
│            │   Orb    │  ← Interactive  │
│            │ (Calm)   │     breathing   │
│            └──────────┘                 │
│                                         │
│    "How are you feeling today?"        │
│    [✨ Check In]                        │
│    ─────────────────────────────────────│
│    Last Check-in: Today at 9:30 AM     │
│    Mood: Calm • Grateful               │
│    ─────────────────────────────────────│
│    Suggested Programs                   │
│    ┌────────────────────────────┐      │
│    │ Basketball @ 6 PM          │      │
│    └────────────────────────────┘      │
│    ─────────────────────────────────────│
│    Quick Actions                        │
│    [🆘 Get Help] [📍 Find Programs]    │
│    ─────────────────────────────────────│
│    [Home] [Explore] [QR] [Me]          │← Bottom nav (auth)
└─────────────────────────────────────────┘
         │
         ├─── Click "Check In" or Mood Orb
         │
         ▼
┌─────────────────────────────────────────┐
│       Check-In Modal (CheckInForm)      │
│                                         │
│    How are you feeling?                 │
│                                         │
│    ┌─────────────────────────────────┐ │
│    │ [😊] [😐] [😔] [😢] [😰] [🙂] │ │
│    │ Joyful Calm Sad Down Anxious OK│ │
│    └─────────────────────────────────┘ │
│                                         │
│    What else? (Pick all that apply)    │
│    [Grateful] [Tired] [Hopeful]        │
│    [Lonely] [Proud] [Worried] ...      │
│                                         │
│    📝 Notes (optional):                 │
│    ┌─────────────────────────────────┐ │
│    │                                 │ │
│    └─────────────────────────────────┘ │
│                                         │
│    [Cancel] [Save Check-in]            │
└─────────────────────────────────────────┘
         │
         ├─── After saving
         │
         ▼
    Home updates with new streak/check-in
         │
         ├─── Click [Me] in bottom nav
         │
         ▼
┌─────────────────────────────────────────┐
│          Me (Profile) (/me)             │
│                                         │
│    Alex Chen                            │
│    XID: X-AB1234                        │
│    Member since Oct 2025                │
│    ─────────────────────────────────────│
│    Your Stats                           │
│    ┌────────────┐  ┌────────────┐      │
│    │ 5-day     │  │ 12 check-  │      │
│    │ streak 🔥 │  │ ins ✨     │      │
│    └────────────┘  └────────────┘      │
│    ┌────────────┐  ┌────────────┐      │
│    │ 3 programs│  │ 45 XP      │      │
│    │ attended  │  │ 💎         │      │
│    └────────────┘  └────────────┘      │
│    ─────────────────────────────────────│
│    Mood Sparkline (last 30 days)       │
│    ┌─────────────────────────────────┐ │
│    │  /\/\  /\    /\  /\/\          │ │
│    └─────────────────────────────────┘ │
│    ─────────────────────────────────────│
│    Recent Activity                      │
│    • Check-in today at 9:30 AM         │
│    • Attended Basketball (Fri)         │
│    • Saved Art Workshop                │
│    ─────────────────────────────────────│
│    [View Journal] [⚙️ Settings]         │
└─────────────────────────────────────────┘
         │
         ├─── Click [QR] in bottom nav
         │
         ▼
┌─────────────────────────────────────────┐
│        QR Code Scanner (/qr)            │
│                                         │
│    [← Back]        Check In             │
│    ─────────────────────────────────────│
│    ┌─────────────────────────────────┐ │
│    │                                 │ │
│    │      [QR Camera View]           │ │
│    │                                 │ │
│    │   ┌──────────────────┐          │ │
│    │   │  Scan area       │          │ │
│    │   │                  │          │ │
│    │   └──────────────────┘          │ │
│    │                                 │ │
│    └─────────────────────────────────┘ │
│                                         │
│    Point your camera at the program's  │
│    QR code to check in                 │
│                                         │
│    Your XID: X-AB1234                  │
└─────────────────────────────────────────┘
         │
         ├─── After successful scan
         │
         ▼
┌─────────────────────────────────────────┐
│          Success Modal                  │
│                                         │
│    ✅ Checked In!                       │
│                                         │
│    Basketball Skills Development        │
│    Friday, Oct 29 at 6:00 PM           │
│                                         │
│    +10 XP earned                        │
│                                         │
│    [View Program] [Done]               │
└─────────────────────────────────────────┘
```

### Crisis Support (Always Available)

```
┌─────────────────────────────────────────┐
│         Crisis Support Sheet            │
│                                         │
│    [×]               Get Help           │
│    ─────────────────────────────────────│
│    If you're in crisis, you're not alone│
│                                         │
│    24/7 Crisis Support                  │
│    ┌─────────────────────────────────┐ │
│    │ 🆘 Crisis Hotline               │ │
│    │    1-800-XXX-XXXX               │ │
│    │    [Call Now]                   │ │
│    └─────────────────────────────────┘ │
│    ┌─────────────────────────────────┐ │
│    │ 💬 Crisis Text Line             │ │
│    │    Text HOME to 741741          │ │
│    │    [Open Messages]              │ │
│    └─────────────────────────────────┘ │
│    ┌─────────────────────────────────┐ │
│    │ 🌐 Kids Help Phone              │ │
│    │    1-800-668-6868               │ │
│    │    [Call Now]                   │ │
│    └─────────────────────────────────┘ │
│    ─────────────────────────────────────│
│    Local Resources                      │
│    • Alberta Health Services           │
│    • Youth Mental Health Support       │
│    • Indigenous Support Services       │
└─────────────────────────────────────────┘
```

---

## Backend Source Code

### Server Entry Point

**File:** `server/index.js`

```javascript
import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgStore = pgSession(session);

async function createServer() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(cookieParser());
  
  // Session configuration
  app.use(session({
    store: new PgStore({
      pool,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'room-xi-connect-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax'
    }
  }));

  // Import API routes
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: programRoutes } = await import('./routes/programs.js');
  const { default: checkinRoutes } = await import('./routes/checkins.js');
  const { default: profileRoutes } = await import('./routes/profile.js');
  const { default: xidRoutes } = await import('./routes/xid.js');
  const { default: consentRoutes } = await import('./routes/consent.js');
  const { default: crisisRoutes } = await import('./routes/crisis.js');

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/checkins', checkinRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/xid', xidRoutes);
  app.use('/api/consent', consentRoutes);
  app.use('/api/crisis', crisisRoutes);

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  const port = process.env.PORT || 5000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
}

createServer().catch(console.error);
```

### Database Connection

**File:** `server/db.js`

```javascript
import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// HTTP client for Drizzle queries
const sql = neon(connectionString);
export const db = drizzle(sql, { schema });

// Pool for session storage
export const pool = new Pool({ connectionString });
```

### Authentication Routes

**File:** `server/routes/auth.js`

```javascript
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users, profiles } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, preferredName, age, city } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
    }).returning();

    // Create profile
    await db.insert(profiles).values({
      userId: user.id,
      firstName,
      lastName,
      preferredName,
      age,
      city,
      accountComplete: true,
    });

    // Set session
    req.session.user = {
      id: user.id,
      email: user.email,
    };

    res.json({ data: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
    };

    res.json({ data: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({ data: { user: req.session.user } });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ data: { success: true } });
  });
});

// Reset password (future: send email)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  
  // TODO: Implement email sending
  // For now, just acknowledge the request
  res.json({ data: { message: 'Password reset instructions sent to email (if account exists)' } });
});

// Update password
router.post('/update-password', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, req.session.user.id));

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Password update failed' });
  }
});

// Delete account
router.delete('/account', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { confirm } = req.body;

    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ error: 'Invalid confirmation' });
    }

    // Delete user (cascade will handle related data)
    await db.delete(users).where(eq(users.id, req.session.user.id));

    req.session.destroy();
    res.clearCookie('connect.sid');

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Account deletion failed' });
  }
});

export default router;
```

### Check-ins Routes

**File:** `server/routes/checkins.js`

```javascript
import express from 'express';
import { db } from '../db.js';
import { checkins, profiles } from '../schema.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Create check-in
router.post('/', requireAuth, async (req, res) => {
  try {
    const { timestamp, dimension, moodLevel16, affectTags, note, localTz } = req.body;
    const userId = req.session.user.id;

    const now = new Date(timestamp || Date.now());
    const checkinDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Create check-in
    const [checkin] = await db.insert(checkins).values({
      userId,
      timestamp: now,
      checkinDate,
      dimension: dimension || 'mood',
      moodLevel16,
      affectTags: affectTags || [],
      note,
      localTz,
    }).returning();

    // Update streak (simplified - real implementation would check consecutive days)
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    
    const lastCheckin = profile?.lastCheckinDate ? new Date(profile.lastCheckinDate) : null;
    const today = new Date(checkinDate);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let newStreak = profile?.streakCount || 0;
    
    if (!lastCheckin || lastCheckin.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      newStreak++;
    } else if (lastCheckin.toISOString().split('T')[0] !== today.toISOString().split('T')[0]) {
      newStreak = 1;
    }

    await db.update(profiles)
      .set({
        lastCheckinDate: checkinDate,
        streakCount: newStreak,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    res.json({ data: checkin });
  } catch (error) {
    console.error('Create check-in error:', error);
    
    // Handle duplicate check-in for same day
    if (error.code === '23505') {
      return res.status(400).json({ error: 'You have already checked in today' });
    }
    
    res.status(500).json({ error: 'Failed to create check-in' });
  }
});

// Get user's check-ins
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const userCheckins = await db.select()
      .from(checkins)
      .where(eq(checkins.userId, userId))
      .orderBy(desc(checkins.timestamp))
      .limit(100);

    res.json({ data: userCheckins });
  } catch (error) {
    console.error('Get check-ins error:', error);
    res.status(500).json({ error: 'Failed to fetch check-ins' });
  }
});

export default router;
```

### Programs Routes

**File:** `server/routes/programs.js`

```javascript
import express from 'express';
import { db } from '../db.js';
import { programs, savedPrograms } from '../schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get all programs (public)
router.get('/', async (req, res) => {
  try {
    const allPrograms = await db.select().from(programs);
    res.json({ data: allPrograms });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

// Get program by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const [program] = await db.select().from(programs).where(eq(programs.id, req.params.id));
    
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ data: program });
  } catch (error) {
    console.error('Get program error:', error);
    res.status(500).json({ error: 'Failed to fetch program' });
  }
});

// Get user's saved programs
router.get('/saved/list', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const saved = await db.select({
      program: programs,
      savedAt: savedPrograms.createdAt,
    })
      .from(savedPrograms)
      .innerJoin(programs, eq(savedPrograms.programId, programs.id))
      .where(eq(savedPrograms.userId, userId));

    // Transform to flat array of programs with savedAt
    const programsWithSavedAt = saved.map(s => ({
      ...s.program,
      savedAt: s.savedAt,
    }));

    res.json({ data: programsWithSavedAt });
  } catch (error) {
    console.error('Get saved programs error:', error);
    res.status(500).json({ error: 'Failed to fetch saved programs' });
  }
});

// Save a program
router.post('/saved/:programId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { programId } = req.params;

    // Check if program exists
    const [program] = await db.select().from(programs).where(eq(programs.id, programId));
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Insert (will fail if already saved due to primary key)
    await db.insert(savedPrograms).values({
      userId,
      programId,
    });

    res.json({ data: { success: true } });
  } catch (error) {
    // Duplicate save (already saved)
    if (error.code === '23505') {
      return res.json({ data: { success: true } }); // Idempotent
    }

    console.error('Save program error:', error);
    res.status(500).json({ error: 'Failed to save program' });
  }
});

// Unsave a program
router.delete('/saved/:programId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { programId } = req.params;

    await db.delete(savedPrograms)
      .where(and(
        eq(savedPrograms.userId, userId),
        eq(savedPrograms.programId, programId)
      ));

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Unsave program error:', error);
    res.status(500).json({ error: 'Failed to unsave program' });
  }
});

export default router;
```

### Profile Routes

**File:** `server/routes/profile.js`

```javascript
import express from 'express';
import { db } from '../db.js';
import { profiles } from '../schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Get user profile
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ data: profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.createdAt;
    delete updates.xpPoints; // XP awarded via actions, not direct updates

    await db.update(profiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId));

    res.json({ data: { success: true } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
```

### XID Routes

**File:** `server/routes/xid.js`

```javascript
import express from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { xids, attendance, programs } from '../schema.js';
import { eq, desc } from 'drizzle-orm';

const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Generate XID code (non-identifying)
function generateXIDCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0, I/1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'X-' + code;
}

// Create or get user's XID
router.post('/create', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Check if user already has XID
    const [existing] = await db.select().from(xids).where(eq(xids.userId, userId));

    if (existing) {
      return res.json({ data: { xid: existing.xidHash } });
    }

    // Generate unique XID
    let xidCode;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      xidCode = generateXIDCode();
      const xidHash = crypto.createHash('sha256').update(xidCode).digest('hex');

      const [collision] = await db.select().from(xids).where(eq(xids.xidHash, xidHash));

      if (!collision) {
        // Create XID
        await db.insert(xids).values({
          userId,
          xidHash,
          checksum: xidCode.slice(-2), // Last 2 chars as checksum
        });

        return res.json({ data: { xid: xidCode } });
      }

      attempts++;
    }

    res.status(500).json({ error: 'Failed to generate unique XID' });
  } catch (error) {
    console.error('Create XID error:', error);
    res.status(500).json({ error: 'Failed to create XID' });
  }
});

// Get user's XID
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [xid] = await db.select().from(xids).where(eq(xids.userId, userId));

    if (!xid) {
      return res.status(404).json({ error: 'XID not found. Create one first.' });
    }

    // Return XID with checksum (for display)
    const displayXID = `X-${xid.checksum ? '****' + xid.checksum : '******'}`;

    res.json({ data: { xid: displayXID, xidId: xid.id } });
  } catch (error) {
    console.error('Get XID error:', error);
    res.status(500).json({ error: 'Failed to fetch XID' });
  }
});

// Record attendance
router.post('/attendance', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { programId, method, site } = req.body;

    // Get user's XID
    const [xid] = await db.select().from(xids).where(eq(xids.userId, userId));

    if (!xid) {
      return res.status(404).json({ error: 'XID not found. Create one first.' });
    }

    // Record attendance
    const [record] = await db.insert(attendance).values({
      xidId: xid.id,
      programId,
      timestamp: new Date(),
      method: method || 'manual',
      site,
    }).returning();

    res.json({ data: { ...record, xpEarned: 10 } });
  } catch (error) {
    console.error('Record attendance error:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get user's attendance history
router.get('/attendance', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get user's XID
    const [xid] = await db.select().from(xids).where(eq(xids.userId, userId));

    if (!xid) {
      return res.json({ data: [] });
    }

    // Get attendance records with program details
    const records = await db.select({
      id: attendance.id,
      timestamp: attendance.timestamp,
      method: attendance.method,
      site: attendance.site,
      programTitle: programs.title,
      programOrganizer: programs.organizer,
    })
      .from(attendance)
      .innerJoin(programs, eq(attendance.programId, programs.id))
      .where(eq(attendance.xidId, xid.id))
      .orderBy(desc(attendance.timestamp));

    res.json({ data: records });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

export default router;
```

### Crisis Support Routes

**File:** `server/routes/crisis.js`

```javascript
import express from 'express';
import { db } from '../db.js';
import { crisisSupports } from '../schema.js';

const router = express.Router();

// Get crisis resources (public)
router.get('/', async (req, res) => {
  try {
    const resources = await db.select().from(crisisSupports);

    // Organize by category
    const organized = {
      phone: resources.filter(r => r.category === 'phone'),
      text: resources.filter(r => r.category === 'text'),
      chat: resources.filter(r => r.category === 'chat'),
      local: resources.filter(r => r.category === 'local'),
    };

    res.json({ data: organized });
  } catch (error) {
    console.error('Get crisis resources error:', error);
    res.status(500).json({ error: 'Failed to fetch crisis resources' });
  }
});

export default router;
```

---

## Frontend Source Code

### API Client

**File:** `src/lib/api.ts`

```typescript
// API client to replace Supabase client
const API_BASE = '/api';

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

async function fetchApi<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'An error occurred' };
    }

    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

export const api = {
  // Auth
  auth: {
    register: (email: string, password: string, profile?: any) =>
      fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...profile }),
      }),
    login: (email: string, password: string) =>
      fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      fetchApi('/auth/logout', {
        method: 'POST',
      }),
    getUser: () => fetchApi('/auth/me'),
    resetPassword: (email: string) =>
      fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    updatePassword: (newPassword: string) =>
      fetchApi('/auth/update-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      }),
    deleteAccount: (confirm: string) =>
      fetchApi('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ confirm }),
      }),
  },

  // Programs
  programs: {
    list: () => fetchApi('/programs'),
    get: (id: string) => fetchApi(`/programs/${id}`),
    saved: {
      list: () => fetchApi('/programs/saved/list'),
      add: (programId: string) =>
        fetchApi(`/programs/saved/${programId}`, { method: 'POST' }),
      remove: (programId: string) =>
        fetchApi(`/programs/saved/${programId}`, { method: 'DELETE' }),
    },
  },

  // Check-ins
  checkins: {
    list: () => fetchApi('/checkins'),
    create: (data: {
      timestamp?: string;
      dimension: string;
      moodLevel16: number;
      affectTags?: string[];
      note?: string;
      localTz?: string;
    }) =>
      fetchApi('/checkins', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Profile
  profile: {
    get: () => fetchApi('/profile'),
    update: (data: any) =>
      fetchApi('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // XID
  xid: {
    create: () =>
      fetchApi('/xid/create', {
        method: 'POST',
      }),
    recordAttendance: (programId: string, method = 'manual', site?: string) =>
      fetchApi('/xid/attendance', {
        method: 'POST',
        body: JSON.stringify({ programId, method, site }),
      }),
    getAttendance: () => fetchApi('/xid/attendance'),
  },

  // Consent
  consent: {
    list: () => fetchApi('/consent'),
    update: (consentType: string, value: boolean, grantedBy = 'self') =>
      fetchApi('/consent', {
        method: 'POST',
        body: JSON.stringify({ consentType, value, grantedBy }),
      }),
  },

  // Crisis supports
  crisis: {
    list: () => fetchApi('/crisis'),
    getResources: () => fetchApi('/crisis'),
  },
};

export default api;
```

### Session Provider

**File:** `src/lib/session.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data, error } = await api.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const refreshSession = async () => {
    setLoading(true);
    await fetchUser();
  };

  const signOut = async () => {
    await api.auth.logout();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <SessionContext.Provider value={{ user, loading, signOut, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
```

### Offline Queue System

**File:** `src/lib/queue.ts`

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { useState, useEffect } from 'react';

interface QueueItem {
  id: string;
  type: 'save_program' | 'unsave_program' | 'checkin' | 'attendance';
  payload: any;
  timestamp: number;
  attempts: number;
}

interface QueueDB extends DBSchema {
  queue: {
    key: string;
    value: QueueItem;
  };
}

const DB_NAME = 'roomxi-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

let db: IDBPDatabase<QueueDB> | null = null;

async function getDB() {
  if (db) return db;

  db = await openDB<QueueDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });

  return db;
}

// Add item to queue
export async function addToQueue(type: QueueItem['type'], payload: any): Promise<void> {
  const db = await getDB();
  
  const item: QueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    attempts: 0,
  };

  await db.add(STORE_NAME, item);
}

// Process queue (retry pending items)
export async function processQueue(): Promise<void> {
  const db = await getDB();
  const items = await db.getAll(STORE_NAME);

  for (const item of items) {
    try {
      // Attempt to sync based on type
      // TODO: Implement actual API calls based on item.type
      
      // If successful, remove from queue
      await db.delete(STORE_NAME, item.id);
    } catch (error) {
      // Increment attempts
      item.attempts++;
      await db.put(STORE_NAME, item);
    }
  }
}

// Clear all queue items
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

// Get queue count
export async function getQueueCount(): Promise<number> {
  const db = await getDB();
  const items = await db.getAll(STORE_NAME);
  return items.length;
}

// React hook for queue status
export function useQueue() {
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await getQueueCount();
      setItemCount(count);
    };

    updateCount();

    // Update every 5 seconds
    const interval = setInterval(updateCount, 5000);

    return () => clearInterval(interval);
  }, []);

  return { itemCount };
}

// Auto-process queue when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', processQueue);
}
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
  "email": "alex@example.com",
  "password": "securepass123",
  "firstName": "Alex",
  "lastName": "Chen",
  "preferredName": "Alex",
  "age": 18,
  "city": "Edmonton"
}
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alex@example.com"
  }
}
```

**Session Cookie Set:**
```
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; SameSite=Lax
```

#### POST /api/auth/login
Sign in with email and password.

**Request:**
```json
{
  "email": "alex@example.com",
  "password": "securepass123"
}
```

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alex@example.com"
  }
}
```

#### POST /api/auth/logout
End the current session.

**Response:**
```json
{
  "data": { "success": true }
}
```

**Cookie Cleared:**
```
Set-Cookie: connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

#### GET /api/auth/me
Check if user is authenticated.

**Response (Authenticated):**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "alex@example.com"
    }
  }
}
```

**Response (Not Authenticated):**
```json
{
  "error": "Not authenticated"
}
```
**Status:** 401

---

### Check-In Endpoints

#### POST /api/checkins
Create a new daily check-in.

**Auth Required:** Yes

**Request:**
```json
{
  "timestamp": "2025-10-29T14:30:00Z",
  "dimension": "mood",
  "moodLevel16": 4,
  "affectTags": ["grateful", "calm", "hopeful"],
  "note": "Had a great day at the basketball program!",
  "localTz": "America/Edmonton"
}
```

**Response:**
```json
{
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-29T14:30:00Z",
    "checkinDate": "2025-10-29",
    "dimension": "mood",
    "moodLevel16": 4,
    "affectTags": ["grateful", "calm", "hopeful"],
    "note": "Had a great day at the basketball program!",
    "localTz": "America/Edmonton",
    "createdAt": "2025-10-29T14:30:05Z"
  }
}
```

**Error (Duplicate):**
```json
{
  "error": "You have already checked in today"
}
```
**Status:** 400

#### GET /api/checkins
List user's check-ins.

**Auth Required:** Yes

**Response:**
```json
{
  "data": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-10-29T14:30:00Z",
      "moodLevel16": 4,
      "affectTags": ["grateful", "calm"],
      "note": "Great day!"
    },
    ...
  ]
}
```

---

### Program Endpoints

#### GET /api/programs
List all programs (public).

**Auth Required:** No

**Response:**
```json
{
  "data": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "title": "Basketball Skills Development",
      "description": "Learn basketball fundamentals in a supportive environment",
      "tags": ["sports", "team", "all-ages"],
      "free": true,
      "indoor": true,
      "outdoor": false,
      "costCents": null,
      "locationName": "Allendale Community League",
      "address": "9210 118 Ave NW, Edmonton",
      "lat": "53.5461",
      "lng": "-113.4938",
      "organizer": "OTB Basketball",
      "accessibilityNotes": "Wheelchair accessible",
      "nextStart": "2025-10-30T18:00:00Z",
      "nextEnd": "2025-10-30T20:00:00Z",
      "createdAt": "2025-10-01T00:00:00Z"
    },
    ...
  ]
}
```

#### GET /api/programs/:id
Get program details by ID (public).

**Auth Required:** No

**Response:** Same as single program object above

#### GET /api/programs/saved/list
List user's saved programs.

**Auth Required:** Yes

**Response:**
```json
{
  "data": [
    {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "title": "Basketball Skills Development",
      ...
      "savedAt": "2025-10-25T10:00:00Z"
    }
  ]
}
```

#### POST /api/programs/saved/:programId
Save a program.

**Auth Required:** Yes

**Response:**
```json
{
  "data": { "success": true }
}
```

#### DELETE /api/programs/saved/:programId
Unsave a program.

**Auth Required:** Yes

**Response:**
```json
{
  "data": { "success": true }
}
```

---

### Profile Endpoints

#### GET /api/profile
Get current user's profile.

**Auth Required:** Yes

**Response:**
```json
{
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Alex",
    "lastName": "Chen",
    "preferredName": "Alex",
    "age": 18,
    "city": "Edmonton",
    "streakCount": 5,
    "lastCheckinDate": "2025-10-29",
    "xpPoints": 45,
    "accountComplete": true,
    "safetyProfileComplete": false,
    "createdAt": "2025-10-15T00:00:00Z",
    "updatedAt": "2025-10-29T14:30:00Z"
  }
}
```

#### PUT /api/profile
Update profile.

**Auth Required:** Yes

**Request:**
```json
{
  "preferredName": "AJ",
  "city": "Calgary"
}
```

**Response:**
```json
{
  "data": { "success": true }
}
```

---

### XID Endpoints

#### POST /api/xid/create
Generate privacy-preserving XID.

**Auth Required:** Yes

**Response:**
```json
{
  "data": {
    "xid": "X-AB1234"
  }
}
```

#### GET /api/xid
Get user's XID (masked).

**Auth Required:** Yes

**Response:**
```json
{
  "data": {
    "xid": "X-****34",
    "xidId": "850e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### POST /api/xid/attendance
Record program attendance.

**Auth Required:** Yes

**Request:**
```json
{
  "programId": "750e8400-e29b-41d4-a716-446655440000",
  "method": "qr",
  "site": "Allendale Community League"
}
```

**Response:**
```json
{
  "data": {
    "id": "950e8400-e29b-41d4-a716-446655440000",
    "xidId": "850e8400-e29b-41d4-a716-446655440000",
    "programId": "750e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-29T18:05:00Z",
    "method": "qr",
    "site": "Allendale Community League",
    "xpEarned": 10
  }
}
```

#### GET /api/xid/attendance
Get attendance history.

**Auth Required:** Yes

**Response:**
```json
{
  "data": [
    {
      "id": "950e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-10-29T18:05:00Z",
      "method": "qr",
      "site": "Allendale Community League",
      "programTitle": "Basketball Skills Development",
      "programOrganizer": "OTB Basketball"
    },
    ...
  ]
}
```

---

### Crisis Support Endpoints

#### GET /api/crisis
Get crisis resources (public).

**Auth Required:** No

**Response:**
```json
{
  "data": {
    "phone": [
      {
        "id": "a50e8400-e29b-41d4-a716-446655440000",
        "region": "canada",
        "category": "phone",
        "name": "Crisis Hotline",
        "phone": "1-800-XXX-XXXX",
        "hours": "24/7",
        "notes": null
      }
    ],
    "text": [
      {
        "id": "b50e8400-e29b-41d4-a716-446655440000",
        "region": "canada",
        "category": "text",
        "name": "Crisis Text Line",
        "textCode": "741741",
        "notes": "Text HOME to 741741"
      }
    ],
    "chat": [...],
    "local": [...]
  }
}
```

---

## Data Flow Diagrams

### Authentication Flow

```
┌─────────────┐
│ User enters │
│ credentials │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Login.tsx           │
│ - Validates input   │
│ - Calls API         │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ api.auth.login(email, password) │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ POST /api/auth/login             │
│ - Query database for user        │
│ - bcrypt.compare(password, hash) │
└──────┬───────────────────────────┘
       │
       ├─── Invalid credentials
       │    └─► 401 Error
       │
       ├─── Valid credentials
       │
       ▼
┌──────────────────────────────────┐
│ req.session.user = { id, email } │
│ Session stored in PostgreSQL     │
└──────┬───────────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Set-Cookie: connect.sid=... │
│ httpOnly, SameSite=lax      │
└──────┬──────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Response: { data: user }   │
└──────┬─────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ SessionProvider.setUser()    │
│ Update global session state  │
└──────┬───────────────────────┘
       │
       ▼
┌────────────────────┐
│ Navigate to /home  │
└────────────────────┘
```

### Check-In Flow

```
┌──────────────────┐
│ User clicks      │
│ "Check In" btn   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│ CheckInForm opens   │
│ - Mood selector     │
│ - Affect tags       │
│ - Note textarea     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ User selects mood + tags + note │
└────────┬────────────────────────┘
         │
         ▼
┌───────────────────────────────┐
│ api.checkins.create({         │
│   moodLevel16: 4,             │
│   affectTags: ['grateful'],   │
│   note: "Great day!"          │
│ })                            │
└────────┬──────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ POST /api/checkins               │
│ - Get userId from session        │
│ - Get current date               │
│ - Check for duplicate (same day) │
└────────┬─────────────────────────┘
         │
         ├─── Already checked in today
         │    └─► 400 Error
         │
         ├─── New check-in
         │
         ▼
┌──────────────────────────────────┐
│ INSERT INTO checkins             │
│ - userId, timestamp, mood, etc.  │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Calculate streak:                    │
│ - Get last_checkin_date from profile│
│ - If yesterday: streak++             │
│ - If today: no change                │
│ - Else: streak = 1 (restart)         │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ UPDATE profiles                  │
│ SET last_checkin_date = today,   │
│     streak_count = new_streak    │
└────────┬─────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Response: { data: checkin }    │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ CheckInForm closes             │
│ Home.tsx refreshes data        │
│ - Updated streak displayed     │
│ - Last check-in shows new data │
└────────────────────────────────┘
```

### Save Program Flow (Online)

```
┌──────────────────────┐
│ User clicks "Save"   │
│ button on card       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│ ProgramCard.toggleSave()     │
│ - Prevent card navigation    │
│ - Check authentication       │
└────────┬─────────────────────┘
         │
         ├─── Not authenticated
         │    └─► Navigate to /auth/login
         │
         ├─── Authenticated
         │
         ▼
┌────────────────────────────────┐
│ api.programs.saved.add(id)     │
└────────┬───────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ POST /api/programs/saved/:id    │
│ - Get userId from session       │
│ - Check program exists          │
└────────┬────────────────────────┘
         │
         ├─── Program not found
         │    └─► 404 Error
         │
         ├─── Program exists
         │
         ▼
┌───────────────────────────────────┐
│ INSERT INTO saved_programs        │
│ (userId, programId, createdAt)    │
└────────┬──────────────────────────┘
         │
         ├─── Already saved (duplicate key)
         │    └─► Return success (idempotent)
         │
         ├─── Inserted successfully
         │
         ▼
┌────────────────────────────────┐
│ Response: { data: {success} }  │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ setIsSaved(true)               │
│ Button updates:                │
│ ❤️ → ❤️ (filled, gold)        │
│ "Save" → "Saved"               │
└────────────────────────────────┘
```

### Save Program Flow (Offline)

```
┌──────────────────────┐
│ User clicks "Save"   │
│ (no network)         │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────────┐
│ api.programs.saved.add(id)     │
│ - Network request fails        │
└────────┬───────────────────────┘
         │
         ▼
┌───────────────────────────────┐
│ catch block                   │
│ addToQueue('save_program', {  │
│   user_id: userId,            │
│   program_id: programId       │
│ })                            │
└────────┬──────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ IndexedDB 'queue' store         │
│ {                               │
│   id: uuid(),                   │
│   type: 'save_program',         │
│   payload: {...},               │
│   timestamp: Date.now(),        │
│   attempts: 0                   │
│ }                               │
└────────┬────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ setIsSaved(true) optimistically│
│ Button shows "Saved" + offline │
│ indicator (⏱)                  │
└────────────────────────────────┘
         │
         │ [Network returns]
         │
         ▼
┌────────────────────────────────┐
│ window.addEventListener        │
│ ('online', processQueue)       │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ processQueue()                 │
│ - Get all items from IndexedDB │
│ - Retry each API call          │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ POST /api/programs/saved/:id   │
│ (retried from queue)           │
└────────┬───────────────────────┘
         │
         ├─── Success
         │    └─► Delete from queue
         │
         ├─── Failure
         │    └─► Increment attempts
         │        └─► Keep in queue
         │
         ▼
┌────────────────────────────────┐
│ Queue processed                │
│ User sees success notification │
└────────────────────────────────┘
```

---

## Authentication & Security

### Session-Based Authentication

**Why Sessions Over JWT?**

1. **Server-Side Revocation**: Sessions can be invalidated immediately from the database
2. **No Token Storage Risk**: No localStorage/sessionStorage XSS vulnerability
3. **httpOnly Cookies**: JavaScript cannot access session cookies
4. **Automatic Expiry**: Sessions expire server-side based on activity
5. **CSRF Protection**: SameSite cookies prevent cross-site request forgery

**Session Configuration:**

```javascript
app.use(session({
  store: new PgStore({
    pool,                         // PostgreSQL connection pool
    createTableIfMissing: true,   // Auto-create session table
  }),
  secret: process.env.SESSION_SECRET || 'change-in-production',
  resave: false,                  // Don't save unchanged sessions
  saveUninitialized: false,       // Don't create session for unauthenticated
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,               // No JavaScript access
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax'               // CSRF protection
  }
}));
```

**Session Table:**

```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
```

**Authentication Middleware:**

```javascript
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Usage
app.get('/api/profile', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  // ...
});
```

### Password Security

**Hashing with bcrypt:**

```javascript
// Registration
const passwordHash = await bcrypt.hash(password, 10); // 10 salt rounds

// Login
const match = await bcrypt.compare(password, user.passwordHash);
if (!match) {
  return res.status(401).json({ error: 'Invalid credentials' });
}
```

**Password Requirements:**
- Minimum 6 characters
- No maximum length (bcrypt truncates at 72 chars)
- Stored as hash, never plain text

### XID Privacy System

**Purpose:** Allow attendance tracking without revealing user identity

**XID Format:** `X-AB1234`
- Prefix: `X-`
- 6 characters: A-Z (excluding O/I), 2-9 (excluding 0/1)
- Total combinations: 34^6 = ~1.5 billion unique codes

**XID Generation:**

```javascript
function generateXIDCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'X-' + code;
}

// Hash before storage
const xidHash = crypto.createHash('sha256').update(xidCode).digest('hex');
```

**XID Storage:**

```typescript
{
  id: uuid,
  userId: uuid,          // Link to user (internal only)
  xidHash: string,       // SHA-256 hash of XID code
  checksum: string,      // Last 2 chars for validation
  tombstonedAt: null,    // For revocation
  createdAt: timestamp
}
```

**Attendance with XID:**

```typescript
{
  id: uuid,
  xidId: uuid,           // NOT userId!
  programId: uuid,
  timestamp: timestamp,
  method: 'qr' | 'manual' | 'nfc',
  site: string           // Location of check-in
}
```

**Privacy Guarantee:**
- Program organizers see only XID, never user identity
- Attendance data cannot be cross-referenced without database access
- XIDs can be tombstoned (revoked) without deleting history

---

## Privacy & Compliance

### Alberta PIPA & HIA Compliance

**Key Requirements:**

1. **Purpose Limitation**: Data collected only for specified purposes
2. **Consent Management**: Granular, revocable consent
3. **Data Minimization**: Collect only necessary information
4. **Breach Notification**: 72-hour OIPC reporting
5. **Access Controls**: Role-based permissions
6. **Audit Trails**: Complete logging of data changes

### Two-Layer Consent System

**Layer 1: Account Creation (Required)**

Collected at registration:
- Email & password (authentication)
- First name, last name, preferred name
- Age (13-25 validation)
- City (for program matching)

Consents required:
- `terms_of_use`: Legal terms acceptance
- `privacy_notice`: Privacy policy acknowledgment
- `data_collection`: Permission to collect basic data

**Layer 2: Safety Profile (Before In-Person Programs)**

Collected before first program attendance:
- Legal first/last name (emergency identification)
- Emergency contact (name, phone, relationship)
- Health information (optional, requires HIA consent)
- Photo/media consent (5 separate toggles)
- Indigenous self-identification (optional, OCAP)

**Photo/Media Consent Types:**

1. `photo_internal`: Internal documentation only
2. `photo_social_media`: Social media posts
3. `photo_website`: Website and marketing materials
4. `photo_fundraising`: Fundraising materials
5. `photo_story`: Story/testimonial use (requires additional written consent)

Each consent:
- Can be granted/revoked independently
- Tracks IP address and user agent
- Creates audit event on change
- Cannot be used to "gamify" consent (no XP for consent)

### Health Information Act (HIA) Compliance

**Separate Consent for Health Data:**

```typescript
{
  healthDataConsent: boolean,
  healthConsentGrantedAt: timestamp,
  healthConsentIp: string,
  healthConsentUserAgent: string
}
```

**Health Data Storage:**

```typescript
{
  userId: uuid,
  allergies: text,
  medicalConditions: text,
  medications: text,
  accessibilityNeeds: text,
  dietaryRestrictions: text,
  parqStatus: text,  // Physical Activity Readiness Questionnaire
  parqCompletedAt: timestamp
}
```

**HIA Requirements Met:**
- Separate table for health data
- Explicit consent with audit trail
- Purpose-specific collection
- Secure storage (encrypted at rest)
- Access controls (RLS policies in production)

### Breach Notification System

**72-Hour OIPC Notification:**

```typescript
{
  id: uuid,
  breachType: 'unauthorized_access' | 'data_leak' | 'system_compromise',
  severity: 'low' | 'medium' | 'high' | 'critical',
  affectedUserCount: integer,
  affectedUserIds: uuid[],
  description: text,
  
  // OIPC notification (required within 72 hours)
  oipcNotificationRequired: boolean,
  oipcNotifiedAt: timestamp,
  oipcNotificationMethod: text,
  oipcReferenceNumber: text,
  
  // Individual notifications
  individualsNotifiedAt: timestamp,
  guardiansNotifiedAt: timestamp,  // For minors
  
  // Remediation
  remediationSteps: text,
  remediationCompletedAt: timestamp,
  
  discoveredAt: timestamp
}
```

**Breach Workflow:**

1. Breach discovered → Record in `breach_events`
2. Assess severity and affected users
3. Within 72 hours: Notify OIPC if required
4. Notify affected individuals
5. Notify guardians (for users under 18)
6. Implement remediation steps
7. Track completion

### Guardian Verification

**For Users Under 18 (Optional):**

```typescript
{
  userId: uuid,
  guardianContactType: 'email' | 'phone' | 'alberta_digital_id',
  guardianContactValue: string,    // Actual email/phone
  guardianContactHash: string,     // SHA-256 hash for verification
  verificationToken: string,       // Sent to guardian
  verifiedAt: timestamp,
  expiresAt: timestamp,            // 15-minute expiration
}
```

**Verification Flow:**

1. User provides guardian email/phone at registration
2. System sends verification link/code to guardian
3. Guardian clicks link or enters code
4. Verification recorded with IP/timestamp
5. Account gains "guardian verified" status

**Alberta Digital ID Integration (Future):**
- Planned integration with ATB Ventures' Oliu platform
- Awaiting public API availability
- Will provide government-backed identity verification

### OCAP Principles (Indigenous Data Sovereignty)

**Optional Indigenous Self-Identification:**

```typescript
{
  indigenousIdentity: text,      // e.g., "First Nations", "Métis", "Inuit"
  indigenousCommunity: text,     // e.g., "Cree Nation"
}
```

**OCAP Disclosure:**

When collecting this data, users are informed:
- **Ownership**: You own your data
- **Control**: You control how it's collected, used, and disclosed
- **Access**: You can access your data anytime
- **Possession**: We are stewards, not owners

**Data Use:**
- Aggregate statistics only (never individual identification)
- Cultural adaptation of programs
- Funding applications to support Indigenous youth
- Can be removed at any time without affecting account

---

## Setup & Deployment

### Local Development Setup

**Prerequisites:**
- Node.js 20+
- PostgreSQL (or use Replit Neon instance)

**Installation:**

```bash
# Clone repository
git clone <repo-url>
cd room-xi-connect

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env with your DATABASE_URL
nano .env

# Push database schema
npm run db:push

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

**Environment Variables:**

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SESSION_SECRET=generate-a-random-secret-key

# Optional
VITE_MAP_TILES_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true
```

### Replit Deployment

**1. Configure Deployment:**

File: `.replit`

```toml
run = "npm run dev"

[deployment]
build = ["sh", "-c", "npm run build"]
run = ["sh", "-c", "npm run dev"]
deploymentTarget = "autoscale"
```

**2. Set Secrets:**

In Replit Secrets pane:
```
DATABASE_URL=<your-neon-postgres-url>
SESSION_SECRET=<random-secret-key>
```

**3. Push Schema:**

```bash
npm run db:push
```

**4. Seed Database:**

```bash
npm run db:seed
```

**5. Deploy:**

Click "Deploy" button in Replit, or:

```bash
replit deploy
```

### Database Migrations

**Schema Changes:**

```bash
# Push schema to database
npm run db:push

# Force push (if conflicts)
npm run db:push --force

# Open Drizzle Studio (visual database editor)
npm run db:studio
```

**Seeding:**

File: `server/seed.js`

Creates:
- 1 test user (test@example.com / test123)
- 10 sample programs across Edmonton
- Crisis support resources

```bash
npm run db:seed
```

### Production Checklist

**Before deploying to production:**

- [ ] Set strong `SESSION_SECRET`
- [ ] Enable `secure` cookies (HTTPS only)
- [ ] Set up production database backups
- [ ] Configure error tracking (e.g., Sentry)
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up email service for password resets
- [ ] Review and test all PIPA/HIA compliance features
- [ ] Test breach notification workflow
- [ ] Configure monitoring and alerts
- [ ] Review all environment variables
- [ ] Test offline sync functionality
- [ ] Validate all API endpoints
- [ ] Run security audit
- [ ] Test on multiple devices/browsers
- [ ] Review accessibility (WCAG 2.1 AA)

---

## Appendix

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx server/index.js",
    "build": "vite build",
    "preview": "vite preview --port 5000 --host 0.0.0.0",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx server/seed.js"
  }
}
```

### Database Indexes

**Critical indexes for performance:**

```sql
-- Check-ins: One per day enforcement + user timestamp queries
CREATE UNIQUE INDEX checkins_one_per_day_idx ON checkins(user_id, checkin_date);
CREATE INDEX checkins_user_ts_idx ON checkins(user_id, timestamp DESC);

-- Attendance: XID-based queries
CREATE INDEX attendance_xid_ts_idx ON attendance(xid_id, timestamp DESC);

-- Consent events: Audit trail queries
CREATE INDEX consent_events_user_idx ON consent_events(user_id, occurred_at DESC);

-- Breach events: Discovery timeline
CREATE INDEX breach_events_discovered_idx ON breach_events(discovered_at DESC);

-- Organizations: Active org lookups
CREATE INDEX idx_organizations_active ON organizations(active, name);

-- Org members: User and org queries
CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id, role);

-- Referrals: Multi-directional queries
CREATE INDEX idx_referrals_from ON referrals(from_org_id, status);
CREATE INDEX idx_referrals_to ON referrals(to_org_id, status);
CREATE INDEX idx_referrals_youth ON referrals(youth_id, created_at DESC);

-- Audit trail: High-volume logging
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_table ON audit_trail(table_name, timestamp DESC);
CREATE INDEX idx_audit_trail_action ON audit_trail(action, result, timestamp DESC);
```

### Test Credentials

**Default test account:**
```
Email: test@example.com
Password: test123
```

Created by seed script with:
- Profile data
- 5-day streak
- Sample check-ins
- XID: X-TEST1

---

## Credits

**Developed for:** Room 11 Foundation  
**Architecture:** Express.js + React + Drizzle ORM + PostgreSQL (Neon)  
**License:** Copyright © 2025 Room 11 Foundation. All rights reserved.  

**Partners:**
- CanManDan
- JumpStart
- Allendale Community League
- Duggan Community League
- YMCA of Northern Alberta
- OTB Basketball

**Technology:**
- OpenStreetMap for map tiles
- Replit for hosting infrastructure
- Neon for PostgreSQL database

---

**Document Version:** 1.0.0  
**Last Updated:** October 29, 2025  
**Maintained By:** Development Team

For questions or support, contact: tech@room11foundation.org
