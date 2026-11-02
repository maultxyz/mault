ALTER TABLE "tcgplayer_sku_sets" ADD COLUMN "skus_modified" text;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "near_mint_market_price" double precision;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "lightly_played_market_price" double precision;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "moderately_played_market_price" double precision;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "heavily_played_market_price" double precision;--> statement-breakpoint
ALTER TABLE "tcgplayer_skus" ADD COLUMN "damaged_market_price" double precision;