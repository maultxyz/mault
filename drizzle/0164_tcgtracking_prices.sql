CREATE TABLE "tcgplayer_price_sets" (
	"category_id" integer NOT NULL,
	"set_id" integer NOT NULL,
	"products_modified" text,
	"pricing_modified" text,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tcgplayer_price_sets_category_id_set_id_pk" PRIMARY KEY("category_id","set_id")
);
--> statement-breakpoint
ALTER TABLE "tcgplayer_prices" DROP COLUMN "mid_price";--> statement-breakpoint
ALTER TABLE "tcgplayer_prices" DROP COLUMN "high_price";--> statement-breakpoint
ALTER TABLE "tcgplayer_prices" DROP COLUMN "direct_low_price";