ALTER TABLE "cards" ADD COLUMN "embedding_version" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "source_data_hash" text;--> statement-breakpoint
UPDATE "cards" SET "embedding_version" = 1 WHERE "updated_at" >= '2026-09-29';
