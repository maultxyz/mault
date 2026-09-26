CREATE TABLE IF NOT EXISTS "tcgplayer_prices" (
	"product_id" integer NOT NULL,
	"sub_type" text NOT NULL,
	"category_id" integer NOT NULL,
	"low_price" double precision,
	"mid_price" double precision,
	"high_price" double precision,
	"market_price" double precision,
	"direct_low_price" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tcgplayer_prices_product_id_sub_type_pk" PRIMARY KEY("product_id","sub_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tcgplayer_products" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"name" text NOT NULL,
	"number" text,
	"rarity" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "data" jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tcgplayer_products_category_number_idx" ON "tcgplayer_products" USING btree ("category_id","number");