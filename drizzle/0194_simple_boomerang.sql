ALTER TABLE "tcgplayer_skus" ADD COLUMN "near_mint_listing_count" integer;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "lightly_played_listing_count" integer;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "moderately_played_listing_count" integer;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "heavily_played_listing_count" integer;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "damaged_listing_count" integer;