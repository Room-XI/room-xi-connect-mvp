CREATE TABLE "parent_magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_magic_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "login_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_minor" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "guardian_email" text;--> statement-breakpoint
CREATE INDEX "parent_magic_links_email_idx" ON "parent_magic_links" USING btree ("email");--> statement-breakpoint
CREATE INDEX "parent_magic_links_token_idx" ON "parent_magic_links" USING btree ("token_hash");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_login_code_unique" UNIQUE("login_code");