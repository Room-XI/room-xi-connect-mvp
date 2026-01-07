import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users, guardianVerifications } from "./schema.ts";

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
    programEventId: uuid("program_event_id").notNull(),
    type: text("type").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uIdx: index("mood_tasks_user_due_idx").on(t.userId, t.dueAt),
  })
);
