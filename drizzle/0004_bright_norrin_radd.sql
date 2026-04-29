CREATE TABLE "account_lockouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_lockouts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crisis_escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"recipient_type" text NOT NULL,
	"recipient_id" uuid,
	"recipient_email_hash" text,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"error_message" text,
	"provider_message_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crisis_followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"escalation_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"followup_type" text DEFAULT 'ximi_message' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"feature_key" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"status" text DEFAULT 'interested' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_user_id_program_id_pk" PRIMARY KEY("user_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "safety_plan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"actor_ip" text,
	"actor_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_plan_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"label" text,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "safety_plan_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "safety_plans" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan_data" jsonb DEFAULT '{
    "warningSigns": [],
    "copingSteps": [],
    "safePlaces": [],
    "trustedContacts": [],
    "professionalSupport": [],
    "escalationSteps": [],
    "notesForOthers": {"helps": "", "notHelpful": "", "supportNotes": ""}
  }'::jsonb NOT NULL,
	"plan_version" integer DEFAULT 1 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"consent_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentiment_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"sentiment_label" text DEFAULT 'unknown' NOT NULL,
	"sentiment_score" numeric,
	"emotions" jsonb,
	"themes" text[] DEFAULT '{}' NOT NULL,
	"confidence" numeric,
	"crisis_flagged" boolean DEFAULT false NOT NULL,
	"crisis_flags" jsonb,
	"model" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"home_team_id" uuid,
	"away_team_id" uuid,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"venue_name" text,
	"venue_address" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"max_uses" integer DEFAULT 10,
	"uses" integer DEFAULT 0,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "tournament_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"team_id" uuid,
	"type" text DEFAULT 'team' NOT NULL,
	"answers" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_standings" (
	"tournament_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"wins" integer DEFAULT 0,
	"losses" integer DEFAULT 0,
	"ties" integer DEFAULT 0,
	"points" integer DEFAULT 0,
	"rank" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_standings_tournament_id_team_id_pk" PRIMARY KEY("tournament_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_team_members" (
	"team_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" text NOT NULL,
	"captain_user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"public_id" text NOT NULL,
	"name" text DEFAULT 'Untitled Tournament' NOT NULL,
	"description" text,
	"format" text DEFAULT 'league',
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"registration_fields" jsonb,
	"team_size_min" integer DEFAULT 2,
	"team_size_max" integer DEFAULT 10,
	"auto_approve_teams" boolean DEFAULT false,
	"allow_free_agents" boolean DEFAULT true,
	"registration_open_at" timestamp with time zone,
	"registration_close_at" timestamp with time zone,
	"created_by_org_member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tournaments_program_id_unique" UNIQUE("program_id"),
	CONSTRAINT "tournaments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "user_attribution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid,
	"campaign" text,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_org_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"role" text DEFAULT 'participant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xip_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"points_awarded" integer NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xip_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_activity_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "xip_points_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "xip_reward_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "xip_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"point_cost" integer NOT NULL,
	"category" text NOT NULL,
	"image_url" text,
	"quantity_available" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_event_id" uuid NOT NULL,
	"type" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_demographics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "parent_links" (
	"parent_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"guardian_role" text DEFAULT 'primary',
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"guardian_verification_id" uuid,
	"password_setup_token" text,
	"password_setup_expires" timestamp with time zone,
	"password_reset_token" text,
	"password_reset_expires" timestamp with time zone,
	"notification_preferences" jsonb DEFAULT '{"consentRequests":true,"referrals":true,"documents":true,"moodAlerts":true}'::jsonb,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parents_email_unique" UNIQUE("email"),
	CONSTRAINT "parents_password_setup_token_unique" UNIQUE("password_setup_token"),
	CONSTRAINT "parents_password_reset_token_unique" UNIQUE("password_reset_token")
);
--> statement-breakpoint
DROP INDEX "youth_demographics_user_idx";--> statement-breakpoint
ALTER TABLE "youth_demographics" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "parent_consent_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "closed_reason" text;--> statement-breakpoint
ALTER TABLE "youth_demographics" ADD COLUMN "answers" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_escalations" ADD CONSTRAINT "crisis_escalations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_followups" ADD CONSTRAINT "crisis_followups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crisis_followups" ADD CONSTRAINT "crisis_followups_escalation_id_crisis_escalations_id_fk" FOREIGN KEY ("escalation_id") REFERENCES "public"."crisis_escalations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_plan_events" ADD CONSTRAINT "safety_plan_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_plan_shares" ADD CONSTRAINT "safety_plan_shares_plan_user_id_users_id_fk" FOREIGN KEY ("plan_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_plans" ADD CONSTRAINT "safety_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentiment_analyses" ADD CONSTRAINT "sentiment_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_games" ADD CONSTRAINT "tournament_games_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_games" ADD CONSTRAINT "tournament_games_home_team_id_tournament_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_games" ADD CONSTRAINT "tournament_games_away_team_id_tournament_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_invites" ADD CONSTRAINT "tournament_invites_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_registrations" ADD CONSTRAINT "tournament_registrations_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standings" ADD CONSTRAINT "tournament_standings_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_team_id_tournament_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."tournament_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_team_members" ADD CONSTRAINT "tournament_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_captain_user_id_users_id_fk" FOREIGN KEY ("captain_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_org_member_id_users_id_fk" FOREIGN KEY ("created_by_org_member_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_attribution" ADD CONSTRAINT "user_attribution_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_attribution" ADD CONSTRAINT "user_attribution_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_org_affiliations" ADD CONSTRAINT "user_org_affiliations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_org_affiliations" ADD CONSTRAINT "user_org_affiliations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xip_activities" ADD CONSTRAINT "xip_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xip_points" ADD CONSTRAINT "xip_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xip_reward_claims" ADD CONSTRAINT "xip_reward_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xip_reward_claims" ADD CONSTRAINT "xip_reward_claims_reward_id_xip_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."xip_rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_tasks" ADD CONSTRAINT "mood_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_demographics" ADD CONSTRAINT "parent_demographics_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_demographics" ADD CONSTRAINT "parent_demographics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_invites" ADD CONSTRAINT "parent_invites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_links" ADD CONSTRAINT "parent_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_guardian_verification_id_guardian_verifications_id_fk" FOREIGN KEY ("guardian_verification_id") REFERENCES "public"."guardian_verifications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_lockouts_email_idx" ON "account_lockouts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "announcements_scope_idx" ON "announcements" USING btree ("scope_type","scope_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crisis_escalations_user_idx" ON "crisis_escalations" USING btree ("user_id","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crisis_escalations_source_idx" ON "crisis_escalations" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "crisis_escalations_status_idx" ON "crisis_escalations" USING btree ("status","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "crisis_followups_user_scheduled_idx" ON "crisis_followups" USING btree ("user_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "crisis_followups_status_idx" ON "crisis_followups" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "safety_plan_events_user_idx" ON "safety_plan_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "safety_plan_events_type_idx" ON "safety_plan_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "safety_plan_shares_plan_user_idx" ON "safety_plan_shares" USING btree ("plan_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "safety_plan_shares_token_hash_idx" ON "safety_plan_shares" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "safety_plan_shares_expires_idx" ON "safety_plan_shares" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "safety_plans_updated_idx" ON "safety_plans" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sentiment_analyses_user_idx" ON "sentiment_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sentiment_analyses_source_idx" ON "sentiment_analyses" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "sentiment_analyses_created_idx" ON "sentiment_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sentiment_analyses_unique_source" ON "sentiment_analyses" USING btree ("user_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "tournament_games_tournament_start_idx" ON "tournament_games" USING btree ("tournament_id","start_time");--> statement-breakpoint
CREATE INDEX "tournament_invites_team_idx" ON "tournament_invites" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "tournament_invites_expires_idx" ON "tournament_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_registrations_tournament_user_idx" ON "tournament_registrations" USING btree ("tournament_id","user_id");--> statement-breakpoint
CREATE INDEX "tournament_registrations_tournament_status_idx" ON "tournament_registrations" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "tournament_team_members_user_idx" ON "tournament_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tournament_teams_tournament_status_idx" ON "tournament_teams" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_teams_tournament_name_idx" ON "tournament_teams" USING btree ("tournament_id","name");--> statement-breakpoint
CREATE INDEX "tournaments_public_id_idx" ON "tournaments" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "tournaments_program_id_idx" ON "tournaments" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "user_attribution_org_campaign_idx" ON "user_attribution" USING btree ("org_id","campaign","created_at");--> statement-breakpoint
CREATE INDEX "user_attribution_user_idx" ON "user_attribution" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_org_affiliations_user_org_idx" ON "user_org_affiliations" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "xip_activities_user_idx" ON "xip_activities" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "xip_activities_type_idx" ON "xip_activities" USING btree ("activity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "xip_points_user_idx" ON "xip_points" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "xip_reward_claims_user_idx" ON "xip_reward_claims" USING btree ("user_id","claimed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "xip_reward_claims_status_idx" ON "xip_reward_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mood_tasks_user_due_idx" ON "mood_tasks" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "parent_demo_parent_idx" ON "parent_demographics" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "parent_demo_user_idx" ON "parent_demographics" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_demo_uq" ON "parent_demographics" USING btree ("parent_id","user_id");--> statement-breakpoint
CREATE INDEX "parent_invites_user_idx" ON "parent_invites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "parent_invites_email_idx" ON "parent_invites" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "parent_user_uq" ON "parent_links" USING btree ("parent_id","user_id");--> statement-breakpoint
CREATE INDEX "parent_links_parent_idx" ON "parent_links" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "parent_links_user_idx" ON "parent_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "parents_email_idx" ON "parents" USING btree ("email");--> statement-breakpoint
CREATE INDEX "parents_setup_token_idx" ON "parents" USING btree ("password_setup_token");--> statement-breakpoint
CREATE INDEX "parents_reset_token_idx" ON "parents" USING btree ("password_reset_token");--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "sexual_orientation";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "sexual_orientation_other";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "gender_identity";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "gender_identity_other";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "pronouns";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "pronouns_other";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "racial_identity";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "racial_identity_other";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "nationality";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "languages_spoken";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "disability";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "disability_details";--> statement-breakpoint
ALTER TABLE "youth_demographics" DROP COLUMN "created_at";