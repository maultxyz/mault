ALTER TABLE "cards" ADD COLUMN "embedding_art" vector(768);--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "embedding_name" vector(768);--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "embedding_bottom" vector(768);