ALTER TABLE "devices" ADD COLUMN "value_celebration_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_threshold" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "value_celebration_price_source" text DEFAULT 'tcgplayer' NOT NULL;