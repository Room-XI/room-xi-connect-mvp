CREATE TYPE "public"."weekday" AS ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');--> statement-breakpoint
CREATE TABLE "program_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"description" text,
	"location_name" text,
	"address" text,
	"lat" text,
	"lng" text,
	"day_of_week" "weekday",
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"occurs_on_date" date,
	"effective_from" date,
	"effective_to" date,
	"is_recurring" boolean DEFAULT true,
	"is_drop_in" boolean DEFAULT false,
	"requires_registration" boolean DEFAULT false,
	"registration_url" text,
	"registration_deadline" text,
	"capacity" integer,
	"age_min" integer,
	"age_max" integer,
	"cost" text,
	"cost_cents" integer DEFAULT 0,
	"notes" text,
	"facilitator" text,
	"timezone" text DEFAULT 'America/Edmonton',
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_events" ADD CONSTRAINT "program_events_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_program_events_program" ON "program_events" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "idx_program_events_active_time" ON "program_events" USING btree ("active","day_of_week","start_time");--> statement-breakpoint
CREATE INDEX "idx_program_events_active_date" ON "program_events" USING btree ("active","occurs_on_date");