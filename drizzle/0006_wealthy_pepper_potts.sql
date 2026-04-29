CREATE TABLE "consent_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"actor_id" text NOT NULL,
	"actor_type" text NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"ip_address" text,
	"user_agent" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"signed_by" uuid NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"signature" text,
	"template_version" integer,
	"withdrawn_at" timestamp with time zone,
	"withdrawn_ip" text,
	"withdrawn_user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"youth_id" uuid NOT NULL,
	"parent_id" uuid,
	"program_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"consent_type" text NOT NULL,
	"required_fields" jsonb DEFAULT '[]',
	"body_text" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_audit_events" ADD CONSTRAINT "consent_audit_events_request_id_consent_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consent_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_request_id_consent_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consent_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_signed_by_parents_id_fk" FOREIGN KEY ("signed_by") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_template_id_consent_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."consent_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_youth_id_users_id_fk" FOREIGN KEY ("youth_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_requests" ADD CONSTRAINT "consent_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_templates" ADD CONSTRAINT "consent_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_audit_events_request_idx" ON "consent_audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "consent_audit_events_actor_idx" ON "consent_audit_events" USING btree ("actor_id","actor_type");--> statement-breakpoint
CREATE INDEX "consent_audit_events_action_idx" ON "consent_audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX "consent_audit_events_time_idx" ON "consent_audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "consent_receipts_request_idx" ON "consent_receipts" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "consent_receipts_signed_by_idx" ON "consent_receipts" USING btree ("signed_by");--> statement-breakpoint
CREATE INDEX "consent_requests_youth_idx" ON "consent_requests" USING btree ("youth_id");--> statement-breakpoint
CREATE INDEX "consent_requests_parent_idx" ON "consent_requests" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "consent_requests_status_idx" ON "consent_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consent_requests_template_idx" ON "consent_requests" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "consent_requests_program_idx" ON "consent_requests" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "consent_templates_org_idx" ON "consent_templates" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "consent_templates_type_idx" ON "consent_templates" USING btree ("consent_type");--> statement-breakpoint
CREATE INDEX "consent_templates_active_idx" ON "consent_templates" USING btree ("active");