ALTER TABLE "devices" ADD COLUMN "light_warnings_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_empty_warning_seconds" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_blocked_warning_seconds" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_normal_seconds" integer DEFAULT 5 NOT NULL;