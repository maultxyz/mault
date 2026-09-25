CREATE TABLE "tcgplayer_products" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"name" text NOT NULL,
	"number" text,
	"rarity" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tcgplayer_products_category_number_idx" ON "tcgplayer_products" USING btree ("category_id","number");