ALTER TABLE "collection_cards" ADD COLUMN "is_reviewed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "collection_cards" SET "is_reviewed" = true WHERE "is_corrected" = true;
