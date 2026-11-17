CREATE TABLE "tcgplayer_sku_sets" (
	"category_id" integer NOT NULL,
	"set_id" integer NOT NULL,
	"products_modified" text,
	"sku_count" integer,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tcgplayer_sku_sets_category_id_set_id_pk" PRIMARY KEY("category_id","set_id")
);
--> statement-breakpoint
CREATE TABLE "tcgplayer_skus" (
	"product_id" integer NOT NULL,
	"variant" text NOT NULL,
	"language" text NOT NULL,
	"category_id" integer NOT NULL,
	"set_id" integer NOT NULL,
	"near_mint_sku_id" integer,
	"lightly_played_sku_id" integer,
	"moderately_played_sku_id" integer,
	"heavily_played_sku_id" integer,
	"damaged_sku_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tcgplayer_skus_product_id_variant_language_pk" PRIMARY KEY("product_id","variant","language")
);
--> statement-breakpoint
CREATE INDEX "tcgplayer_skus_category_set_idx" ON "tcgplayer_skus" USING btree ("category_id","set_id");