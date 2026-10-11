ALTER TABLE "collection_cards" ADD COLUMN "condition" text DEFAULT 'NM' NOT NULL;--> statement-breakpoint
ALTER TABLE "org_settings" ADD COLUMN "condition_multipliers" jsonb;