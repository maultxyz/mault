ALTER TABLE "devices" ADD COLUMN "light_mode" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_color" text DEFAULT '#ffffff' NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "light_brightness" integer DEFAULT 160 NOT NULL;