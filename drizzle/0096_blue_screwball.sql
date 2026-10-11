CREATE TABLE "cardkingdom_prices" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"scryfall_id" text,
	"is_foil" boolean NOT NULL,
	"set_code" text NOT NULL,
	"number" text NOT NULL,
	"retail" double precision,
	"retail_qty" integer,
	"buylist" double precision,
	"url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_prices" ADD COLUMN "price_card_kingdom" double precision;--> statement-breakpoint
ALTER TABLE "card_prices" ADD COLUMN "price_card_kingdom_foil" double precision;--> statement-breakpoint
CREATE INDEX "cardkingdom_prices_scryfall_idx" ON "cardkingdom_prices" USING btree ("scryfall_id");--> statement-breakpoint
CREATE INDEX "cardkingdom_prices_set_number_idx" ON "cardkingdom_prices" USING btree ("set_code","number");