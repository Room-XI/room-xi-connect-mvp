import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, organizations, checkins } from "./schema.ts";
import { parents, parentLinks } from "./schema.extras.ts";

// ==================================================================
// PHASE 2: YOUTH WORKER SYSTEM
// ==================================================================

export const youthWorkers = pgTable("youth_workers", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("worker"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("youth_workers_email_idx").on(table.email),
  orgIdx: index("youth_workers_org_idx").on(table.organizationId),
}));

export const youthWorkerAssignments = pgTable("youth_worker_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  youthWorkerId: uuid("youth_worker_id").notNull().references(() => youthWorkers.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Snapshot of the worker's organization at the time the assignment was
  // created. Pinning the org here (rather than re-deriving from
  // youth_workers.organization_id at read time) means a worker who later
  // moves to a different org loses access to their pre-move assignments —
  // the cross-org tightening required by audit finding C11 / M3.
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  consentStatus: text("consent_status").notNull().default("pending"),
  consentLevel: jsonb("consent_level").notNull().default("{}"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  workerIdx: index("youth_worker_assignments_worker_idx").on(table.youthWorkerId),
  youthIdx: index("youth_worker_assignments_youth_idx").on(table.youthId),
  orgIdx: index("youth_worker_assignments_org_idx").on(table.organizationId),
  workerOrgIdx: index("youth_worker_assignments_worker_org_idx").on(table.youthWorkerId, table.organizationId),
  uniq: index("youth_worker_assignments_uniq").on(table.youthWorkerId, table.youthId, table.organizationId),
}));

// ==================================================================
// PHASE 2: PROACTIVE AI SYSTEM
// ==================================================================

export const aiInterventions = pgTable("ai_interventions", {
  id: uuid("id").primaryKey().defaultRandom(),
  interventionType: text("intervention_type").notNull(),
  content: text("content").notNull(),
  triggerConditions: jsonb("trigger_conditions").notNull(),
  deliveryChannel: text("delivery_channel").notNull().default("in_app_notification"),
  cooldownPeriodHours: integer("cooldown_period_hours").default(24),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeIdx: index("ai_interventions_type_idx").on(table.interventionType),
  activeIdx: index("ai_interventions_active_idx").on(table.active),
}));

export const userInterventionHistory = pgTable("user_intervention_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  interventionId: uuid("intervention_id").notNull().references(() => aiInterventions.id, { onDelete: "cascade" }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).defaultNow(),
  interactionType: text("interaction_type"),
  interactionDetails: jsonb("interaction_details"),
  outcomeMoodLevel: integer("outcome_mood_level"),
  feedbackRating: text("feedback_rating"),
}, (table) => ({
  userIdx: index("user_intervention_history_user_idx").on(table.userId),
  interventionIdx: index("user_intervention_history_intervention_idx").on(table.interventionId),
  deliveredIdx: index("user_intervention_history_delivered_idx").on(table.deliveredAt),
}));

// ==================================================================
// PHASE 2: PARENT CONSENT EXTENSIONS
// Note: Extends existing parentLinks table functionality through new table
// ==================================================================

export const parentYouthConsent = pgTable("parent_youth_consent", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id").notNull().references(() => parents.id, { onDelete: "cascade" }),
  youthId: uuid("youth_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentLevel: jsonb("consent_level").notNull().default("{}"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  parentIdx: index("parent_youth_consent_parent_idx").on(table.parentId),
  youthIdx: index("parent_youth_consent_youth_idx").on(table.youthId),
  uniq: index("parent_youth_consent_uniq").on(table.parentId, table.youthId),
}));

// ==================================================================
// RELATIONS
// ==================================================================

export const youthWorkerRelations = relations(youthWorkers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [youthWorkers.organizationId],
    references: [organizations.id],
  }),
  assignments: many(youthWorkerAssignments),
}));

export const youthWorkerAssignmentRelations = relations(youthWorkerAssignments, ({ one }) => ({
  youthWorker: one(youthWorkers, {
    fields: [youthWorkerAssignments.youthWorkerId],
    references: [youthWorkers.id],
  }),
  youth: one(users, {
    fields: [youthWorkerAssignments.youthId],
    references: [users.id],
  }),
}));

export const aiInterventionRelations = relations(aiInterventions, ({ many }) => ({
  history: many(userInterventionHistory),
}));

export const userInterventionHistoryRelations = relations(userInterventionHistory, ({ one }) => ({
  user: one(users, {
    fields: [userInterventionHistory.userId],
    references: [users.id],
  }),
  intervention: one(aiInterventions, {
    fields: [userInterventionHistory.interventionId],
    references: [aiInterventions.id],
  }),
}));

export const parentYouthConsentRelations = relations(parentYouthConsent, ({ one }) => ({
  parent: one(parents, {
    fields: [parentYouthConsent.parentId],
    references: [parents.id],
  }),
  youth: one(users, {
    fields: [parentYouthConsent.youthId],
    references: [users.id],
  }),
}));
