CREATE TABLE "admin_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid,
	"old_record" jsonb,
	"new_record" jsonb,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"xid_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"method" text NOT NULL,
	"site" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_trail" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_trail_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"org_id" uuid,
	"action" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid,
	"record_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"result" text,
	"error_message" text,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "breach_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"breach_type" text NOT NULL,
	"severity" text NOT NULL,
	"affected_user_count" integer,
	"affected_user_ids" uuid[],
	"description" text NOT NULL,
	"oipc_notification_required" boolean DEFAULT false NOT NULL,
	"oipc_notified_at" timestamp with time zone,
	"oipc_notification_method" text,
	"oipc_reference_number" text,
	"individuals_notified_at" timestamp with time zone,
	"notification_method" text,
	"guardians_notified_at" timestamp with time zone,
	"remediation_steps" text,
	"remediation_completed_at" timestamp with time zone,
	"discovered_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"youth_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"note_encrypted" jsonb NOT NULL,
	"category" text,
	"tags" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"checkin_date" date NOT NULL,
	"dimension" text NOT NULL,
	"mood_level_1_6" integer NOT NULL,
	"mood_type" text,
	"affect_tags" text[] DEFAULT '{}' NOT NULL,
	"wellness_dimensions" text[] DEFAULT '{}',
	"note" text,
	"local_tz" text,
	"crisis_flags" jsonb,
	"crisis_flagged" boolean DEFAULT false,
	"crisis_resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_xid" text NOT NULL,
	"consent_type" text NOT NULL,
	"action" text NOT NULL,
	"previous_value" boolean,
	"new_value" boolean,
	"source" text,
	"ip_address_hash" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"event_type" text NOT NULL,
	"consent_key" text,
	"old_value" boolean,
	"new_value" boolean,
	"ip_address" text,
	"user_agent" text,
	"evidence_ref" text,
	"notes" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reminder_type" text DEFAULT 'monthly',
	"sent_at" timestamp DEFAULT now(),
	"response_at" timestamp,
	"response_action" text
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"user_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"value" boolean NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"granted_by" text,
	"evidence_ref" text,
	"text_version" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consents_user_id_consent_type_pk" PRIMARY KEY("user_id","consent_type")
);
--> statement-breakpoint
CREATE TABLE "coping_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"steps" text[] NOT NULL,
	"duration_minutes" integer,
	"difficulty" text,
	"tags" text[] DEFAULT '{}',
	"culturally_adapted" boolean DEFAULT false,
	"cultural_notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crisis_supports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"text_code" text,
	"chat_url" text,
	"address" text,
	"hours" text,
	"notes" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"author" text,
	"category" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dp_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation" text NOT NULL,
	"table_name" text,
	"query_type" text,
	"original_count" integer,
	"noise_added" boolean DEFAULT true,
	"epsilon" numeric(3, 2) DEFAULT '0.50',
	"mechanism" text DEFAULT 'laplace',
	"suppressed" boolean DEFAULT false,
	"suppression_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "guardian_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"guardian_contact_type" text NOT NULL,
	"guardian_contact_value" text NOT NULL,
	"guardian_contact_hash" text NOT NULL,
	"verification_token" text NOT NULL,
	"verification_method" text,
	"pin_hash" text,
	"verified_at" timestamp with time zone,
	"verified_by_name" text,
	"verified_by_ip" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"allergies" text,
	"medical_conditions" text,
	"medications" text,
	"accessibility_needs" text,
	"dietary_restrictions" text,
	"parq_status" text,
	"parq_completed_at" timestamp with time zone,
	"health_data_consent" boolean DEFAULT false NOT NULL,
	"health_consent_granted_at" timestamp with time zone,
	"health_consent_ip" text,
	"health_consent_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"youth_id" uuid NOT NULL,
	"mood" integer,
	"mood_name" text,
	"prompt" text,
	"title" text,
	"content" text,
	"encrypted" boolean DEFAULT false,
	"encrypted_content" jsonb,
	"ximi_conversation" boolean DEFAULT false,
	"ximi_summary" text,
	"tags" jsonb,
	"word_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mood_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mood" text NOT NULL,
	"message" text,
	"is_approved" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"moderated_at" timestamp,
	"moderated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_trend_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"window_type" text NOT NULL,
	"window_start" date NOT NULL,
	"window_end" date NOT NULL,
	"average_mood_level" numeric(3, 2),
	"mood_variance" numeric(5, 3),
	"dominant_mood" text,
	"trend_direction" text,
	"consecutive_low_days" integer DEFAULT 0,
	"consecutive_high_days" integer DEFAULT 0,
	"patterns_detected" text[] DEFAULT '{}',
	"top_wellness_concerns" text[] DEFAULT '{}',
	"wellness_scores" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_members" (
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"role" text NOT NULL,
	"permissions" jsonb DEFAULT '{"view_referrals": true, "create_referrals": false, "manage_programs": false}',
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_user_id_org_id_pk" PRIMARY KEY("user_id","org_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" jsonb,
	"website" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outcome_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"recommendation_event_id" uuid,
	"attended" boolean NOT NULL,
	"attendance_date" date,
	"sessions_attended" integer DEFAULT 1,
	"helpfulness_rating" integer,
	"would_recommend" boolean,
	"reflection_text" text,
	"mood_before" text,
	"mood_after" text,
	"barriers_encountered" text[] DEFAULT '{}',
	"barriers_resolved" boolean DEFAULT false,
	"follow_up_count" integer DEFAULT 0,
	"last_follow_up_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "peer_success_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"total_responses" integer NOT NULL,
	"average_rating" numeric(3, 2),
	"recommendation_rate" numeric(3, 2),
	"mood_improvement_rate" numeric(3, 2),
	"common_barriers" text[] DEFAULT '{}',
	"differential_privacy_applied" boolean DEFAULT true,
	"k_anonymity_threshold" integer DEFAULT 5,
	"suppressed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"location_sharing" boolean DEFAULT false,
	"orb_sharing" boolean DEFAULT false,
	"reflections_sharing" boolean DEFAULT false,
	"notifications_enabled" boolean DEFAULT false,
	"research_participation" boolean DEFAULT false,
	"reminder_enabled" boolean DEFAULT false,
	"last_reminder_sent" timestamp,
	"reminder_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"weights" jsonb,
	"scores" jsonb,
	"streak_count" integer DEFAULT 0,
	"last_checkin_date" date,
	"is_admin" boolean DEFAULT false NOT NULL,
	"first_name" text,
	"last_name" text,
	"preferred_name" text,
	"age" integer,
	"date_of_birth" date,
	"city" text,
	"postal_code" text,
	"timezone" text DEFAULT 'America/Edmonton',
	"legal_first_name" text,
	"legal_last_name" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"emergency_contact_relationship" text,
	"indigenous_identity" text,
	"indigenous_community" text,
	"account_complete" boolean DEFAULT false,
	"safety_profile_complete" boolean DEFAULT false,
	"program_profile_complete" boolean DEFAULT false,
	"xp_points" integer DEFAULT 0,
	"ximi_consent" boolean DEFAULT false,
	"ximi_mode" text DEFAULT 'sibling',
	"high_visibility" boolean DEFAULT false,
	"pattern_overlay" boolean DEFAULT false,
	"show_color_key" boolean DEFAULT false,
	"mood" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"value" numeric NOT NULL,
	"period_start" date,
	"period_end" date,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"wellness_dimensions" text[] DEFAULT '{}',
	"free" boolean DEFAULT true NOT NULL,
	"drop_in" boolean DEFAULT false,
	"indoor" boolean,
	"outdoor" boolean,
	"cost_cents" integer,
	"location_name" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"lat" text,
	"lng" text,
	"age_min" integer,
	"age_max" integer,
	"organizer" text,
	"org_id" uuid,
	"contact_email" text,
	"contact_phone" text,
	"website" text,
	"accessibility_notes" text,
	"next_start" timestamp with time zone,
	"next_end" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"spots_available" integer,
	"total_capacity" integer,
	"waitlist_length" integer,
	"next_session_date" timestamp with time zone,
	"registration_open" boolean DEFAULT true,
	"provider_api_key" text,
	"last_synced_at" timestamp with time zone,
	"sync_status" text DEFAULT 'pending',
	"sync_error_message" text,
	"webhook_url" text,
	"polling_interval" integer DEFAULT 3600,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"ximi_conversation_id" uuid,
	"recommendation_type" text NOT NULL,
	"mood_trend" text,
	"trigger_reason" text,
	"match_score" numeric(3, 2),
	"user_action" text,
	"action_timestamp" timestamp with time zone,
	"user_feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_org_id" uuid NOT NULL,
	"to_org_id" uuid NOT NULL,
	"youth_id" uuid NOT NULL,
	"summary" text,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending_consent' NOT NULL,
	"sent_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"declined_reason" text,
	"access_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_programs" (
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_programs_user_id_program_id_pk" PRIMARY KEY("user_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_orb_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"cold_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"stormy_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"foggy_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"clear_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"breezy_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"aurora_ratio" numeric(4, 3) DEFAULT '0.000' NOT NULL,
	"dominant_mood" text NOT NULL,
	"total_check_ins" integer DEFAULT 0 NOT NULL,
	"average_mood_level" numeric(3, 2),
	"visual_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"xid_hash" text NOT NULL,
	"checksum" text,
	"tombstoned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xids_xid_hash_unique" UNIQUE("xid_hash")
);
--> statement-breakpoint
CREATE TABLE "ximi_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"checkin_id" uuid,
	"mode" text DEFAULT 'sibling' NOT NULL,
	"user_message" text NOT NULL,
	"ximi_response" text NOT NULL,
	"mood_context" text,
	"dimensions_context" text[] DEFAULT '{}',
	"crisis_detected" boolean DEFAULT false,
	"crisis_keywords" text[] DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_xid_id_xids_id_fk" FOREIGN KEY ("xid_id") REFERENCES "public"."xids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_youth_id_users_id_fk" FOREIGN KEY ("youth_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_reminders" ADD CONSTRAINT "consent_reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardian_verifications" ADD CONSTRAINT "guardian_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profiles" ADD CONSTRAINT "health_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_youth_id_users_id_fk" FOREIGN KEY ("youth_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_drops" ADD CONSTRAINT "mood_drops_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_drops" ADD CONSTRAINT "mood_drops_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_trend_summaries" ADD CONSTRAINT "mood_trend_summaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_events" ADD CONSTRAINT "outcome_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_events" ADD CONSTRAINT "outcome_events_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_events" ADD CONSTRAINT "outcome_events_recommendation_event_id_recommendation_events_id_fk" FOREIGN KEY ("recommendation_event_id") REFERENCES "public"."recommendation_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer_success_insights" ADD CONSTRAINT "peer_success_insights_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_consents" ADD CONSTRAINT "privacy_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_outcomes" ADD CONSTRAINT "program_outcomes_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_feeds" ADD CONSTRAINT "provider_feeds_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_events" ADD CONSTRAINT "recommendation_events_ximi_conversation_id_ximi_conversations_id_fk" FOREIGN KEY ("ximi_conversation_id") REFERENCES "public"."ximi_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_from_org_id_organizations_id_fk" FOREIGN KEY ("from_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_to_org_id_organizations_id_fk" FOREIGN KEY ("to_org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_youth_id_users_id_fk" FOREIGN KEY ("youth_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_orb_snapshots" ADD CONSTRAINT "weekly_orb_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xids" ADD CONSTRAINT "xids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ximi_conversations" ADD CONSTRAINT "ximi_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ximi_conversations" ADD CONSTRAINT "ximi_conversations_checkin_id_checkins_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."checkins"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_xid_ts_idx" ON "attendance" USING btree ("xid_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_trail_timestamp" ON "audit_trail" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_trail_user" ON "audit_trail" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_trail_table" ON "audit_trail" USING btree ("table_name","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_trail_action" ON "audit_trail" USING btree ("action","result","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "breach_events_discovered_idx" ON "breach_events" USING btree ("discovered_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_case_notes_org_youth" ON "case_notes" USING btree ("org_id","youth_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_case_notes_author" ON "case_notes" USING btree ("author_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "checkins_one_per_day_idx" ON "checkins" USING btree ("user_id","checkin_date");--> statement-breakpoint
CREATE INDEX "checkins_user_ts_idx" ON "checkins" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "checkins_crisis_idx" ON "checkins" USING btree ("crisis_flagged","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "consent_events_user_idx" ON "consent_events" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_coping_skills_category" ON "coping_skills" USING btree ("category","active");--> statement-breakpoint
CREATE INDEX "guardian_verifications_user_idx" ON "guardian_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "guardian_verifications_token_idx" ON "guardian_verifications" USING btree ("verification_token");--> statement-breakpoint
CREATE INDEX "idx_journal_youth" ON "journal_entries" USING btree ("youth_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_journal_mood" ON "journal_entries" USING btree ("mood","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mood_drops_user_idx" ON "mood_drops" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mood_drops_public_idx" ON "mood_drops" USING btree ("is_public","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mood_trends_user_window" ON "mood_trend_summaries" USING btree ("user_id","window_type","window_start");--> statement-breakpoint
CREATE INDEX "idx_mood_trends_direction" ON "mood_trend_summaries" USING btree ("trend_direction","computed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_org_members_user" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_org_members_org" ON "org_members" USING btree ("org_id","role");--> statement-breakpoint
CREATE INDEX "idx_organizations_active" ON "organizations" USING btree ("active","name");--> statement-breakpoint
CREATE INDEX "idx_outcome_events_user" ON "outcome_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_outcome_events_program" ON "outcome_events" USING btree ("program_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_outcome_events_attended" ON "outcome_events" USING btree ("attended","program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_peer_success_program_period" ON "peer_success_insights" USING btree ("program_id","period_start");--> statement-breakpoint
CREATE INDEX "idx_peer_success_suppressed" ON "peer_success_insights" USING btree ("suppressed","program_id");--> statement-breakpoint
CREATE INDEX "idx_program_outcomes_program" ON "program_outcomes" USING btree ("program_id","metric","recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_provider_feeds_program" ON "provider_feeds" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_provider_feeds_sync_status" ON "provider_feeds" USING btree ("sync_status","last_synced_at");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX "idx_recommendation_events_user" ON "recommendation_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_recommendation_events_program" ON "recommendation_events" USING btree ("program_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_recommendation_events_action" ON "recommendation_events" USING btree ("user_action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_referrals_from" ON "referrals" USING btree ("from_org_id","status");--> statement-breakpoint
CREATE INDEX "idx_referrals_to" ON "referrals" USING btree ("to_org_id","status");--> statement-breakpoint
CREATE INDEX "idx_referrals_youth" ON "referrals" USING btree ("youth_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_orb_snapshots_user_date_idx" ON "weekly_orb_snapshots" USING btree ("user_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "weekly_orb_snapshots_user_idx" ON "weekly_orb_snapshots" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "weekly_orb_snapshots_date_idx" ON "weekly_orb_snapshots" USING btree ("snapshot_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ximi_user" ON "ximi_conversations" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ximi_crisis" ON "ximi_conversations" USING btree ("crisis_detected","created_at" DESC NULLS LAST);