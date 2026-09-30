ALTER TABLE "unmatched_cards" ADD COLUMN "diagnostics" jsonb;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN "embedding" vector(128);