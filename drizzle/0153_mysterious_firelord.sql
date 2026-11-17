ALTER TABLE "devices" ADD COLUMN "light_mode" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_brightness" integer DEFAULT 160 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_white" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_led_count" integer DEFAULT 16 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_threshold" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_price_source" text DEFAULT 'tcgplayer' NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_duration_ms" integer DEFAULT 500 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_warnings_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_empty_warning_seconds" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_blocked_warning_seconds" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_normal_seconds" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
UPDATE "devices"
SET "value_celebration_duration_ms" = 500
WHERE "value_celebration_duration_ms" < 500;