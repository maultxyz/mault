ALTER TABLE "collection_cards" ADD COLUMN IF NOT EXISTS "captured_back_image_data_url" text;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN IF NOT EXISTS "captured_back_image_key" text;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN IF NOT EXISTS "captured_back_image_data_url" text;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD COLUMN IF NOT EXISTS "captured_back_image_key" text;