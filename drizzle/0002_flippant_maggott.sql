CREATE TABLE "ai_transparency_metrics" (
	"date" date PRIMARY KEY NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"crisis_detected" integer DEFAULT 0 NOT NULL,
	"moderation_flagged" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_delegation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegation_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"actor_type" text,
	"actor_id" text,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_delegations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"youth_id" uuid NOT NULL,
	"guardian_verification_id" uuid,
	"requested_scopes" text[] NOT NULL,
	"purpose_description" text NOT NULL,
	"event_name" text,
	"event_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"consent_link_token" text,
	"consent_link_sent_at" timestamp with time zone,
	"consent_link_expires_at" timestamp with time zone,
	"guardian_decision" text,
	"guardian_decision_at" timestamp with time zone,
	"guardian_decision_ip" text,
	"guardian_decision_user_agent" text,
	"guardian_notes" text,
	"consent_valid_from" timestamp with time zone,
	"consent_valid_until" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"withdrawn_by" text,
	"withdrawal_reason" text,
	"consent_notice_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_delegations_consent_link_token_unique" UNIQUE("consent_link_token")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"is_primary" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardian_perceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guardian_verification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"guardian_relationship" text,
	"guardian_age" text,
	"guardian_gender" text,
	"guardian_race" text[] DEFAULT '{}',
	"perceived_sexual_orientation" text,
	"perceived_gender_identity" text,
	"perceived_racial_identity" text[] DEFAULT '{}',
	"awareness_level" text,
	"comfort_with_identity" text,
	"support_provided" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mature_minor_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"triggered_by" text NOT NULL,
	"guardian_verification_id" uuid,
	"responses" jsonb NOT NULL,
	"assessment_score" integer,
	"meets_capacity_criteria" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"completed_at" timestamp with time zone NOT NULL,
	"staff_reviewed_by" uuid,
	"staff_reviewed_at" timestamp with time zone,
	"staff_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"website" text,
	"client_id" text NOT NULL,
	"client_secret_hash" text NOT NULL,
	"status" text DEFAULT 'pending_approval' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"allowed_scopes" text[] DEFAULT '{}',
	"daily_request_limit" integer DEFAULT 100,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "partner_organizations_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "youth_demographics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sexual_orientation" text,
	"sexual_orientation_other" text,
	"gender_identity" text,
	"gender_identity_other" text,
	"pronouns" text,
	"pronouns_other" text,
	"racial_identity" text[] DEFAULT '{}',
	"racial_identity_other" text,
	"nationality" text,
	"languages_spoken" text[] DEFAULT '{}',
	"disability" text,
	"disability_details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "youth_privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_can_see_mood" boolean DEFAULT true,
	"parent_can_see_demographics" boolean DEFAULT false,
	"parent_can_see_attendance" boolean DEFAULT true,
	"parent_can_see_ximi_chats" boolean DEFAULT false,
	"hidden_program_ids" uuid[] DEFAULT '{}',
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "guardian_phone_number" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "guardian_phone_hash" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "guardian_name" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "consent_notice_version" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "consent_notice_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "initial_consent_token" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "form_nonce" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "initial_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "initial_consent_ip" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "initial_consent_user_agent" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "confirmation_token" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "confirmation_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "confirmed_ip" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "confirmed_user_agent" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "status" text DEFAULT 'pending_initial_consent';--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "reminder_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "withdrawal_ip" text;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD COLUMN "withdrawal_user_agent" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "community_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ward_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_reset_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consent_delegation_events" ADD CONSTRAINT "consent_delegation_events_delegation_id_consent_delegations_id_fk" FOREIGN KEY ("delegation_id") REFERENCES "public"."consent_delegations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_delegations" ADD CONSTRAINT "consent_delegations_partner_id_partner_organizations_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_delegations" ADD CONSTRAINT "consent_delegations_youth_id_users_id_fk" FOREIGN KEY ("youth_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_delegations" ADD CONSTRAINT "consent_delegations_guardian_verification_id_guardian_verifications_id_fk" FOREIGN KEY ("guardian_verification_id") REFERENCES "public"."guardian_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_perceptions" ADD CONSTRAINT "guardian_perceptions_guardian_verification_id_guardian_verifications_id_fk" FOREIGN KEY ("guardian_verification_id") REFERENCES "public"."guardian_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_perceptions" ADD CONSTRAINT "guardian_perceptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mature_minor_assessments" ADD CONSTRAINT "mature_minor_assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mature_minor_assessments" ADD CONSTRAINT "mature_minor_assessments_guardian_verification_id_guardian_verifications_id_fk" FOREIGN KEY ("guardian_verification_id") REFERENCES "public"."guardian_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mature_minor_assessments" ADD CONSTRAINT "mature_minor_assessments_staff_reviewed_by_users_id_fk" FOREIGN KEY ("staff_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youth_demographics" ADD CONSTRAINT "youth_demographics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youth_privacy_settings" ADD CONSTRAINT "youth_privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_consent_delegation_events_delegation" ON "consent_delegation_events" USING btree ("delegation_id");--> statement-breakpoint
CREATE INDEX "idx_consent_delegation_events_type" ON "consent_delegation_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_consent_delegations_partner" ON "consent_delegations" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_consent_delegations_youth" ON "consent_delegations" USING btree ("youth_id");--> statement-breakpoint
CREATE INDEX "idx_consent_delegations_status" ON "consent_delegations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_consent_delegations_token" ON "consent_delegations" USING btree ("consent_link_token");--> statement-breakpoint
CREATE INDEX "emergency_contacts_user_idx" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guardian_perceptions_verification_idx" ON "guardian_perceptions" USING btree ("guardian_verification_id");--> statement-breakpoint
CREATE INDEX "guardian_perceptions_user_idx" ON "guardian_perceptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mature_minor_assessments_user_idx" ON "mature_minor_assessments" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mature_minor_assessments_triggered_idx" ON "mature_minor_assessments" USING btree ("triggered_by","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_partner_orgs_client_id" ON "partner_organizations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_partner_orgs_status" ON "partner_organizations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "youth_demographics_user_idx" ON "youth_demographics" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "youth_privacy_settings_user_idx" ON "youth_privacy_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardian_verifications_initial_token_idx" ON "guardian_verifications" USING btree ("initial_consent_token");--> statement-breakpoint
CREATE INDEX "guardian_verifications_confirmation_token_idx" ON "guardian_verifications" USING btree ("confirmation_token");--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD CONSTRAINT "guardian_verifications_initial_consent_token_unique" UNIQUE("initial_consent_token");--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD CONSTRAINT "guardian_verifications_confirmation_token_unique" UNIQUE("confirmation_token");