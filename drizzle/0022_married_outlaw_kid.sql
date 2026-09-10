ALTER TABLE "collection_cards" ADD COLUMN "foil_type" text;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "foil_types" jsonb DEFAULT '[]'::jsonb NOT NULL;