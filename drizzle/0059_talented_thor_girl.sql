CREATE TABLE "cardmarket_prices" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"low" double precision,
	"trend" double precision,
	"avg" double precision,
	"avg1" double precision,
	"avg7" double precision,
	"avg30" double precision,
	"low_foil" double precision,
	"trend_foil" double precision,
	"avg_foil" double precision,
	"avg1_foil" double precision,
	"avg7_foil" double precision,
	"avg30_foil" double precision,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardmarket_products" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"game_id" integer NOT NULL,
	"name" text NOT NULL,
	"match_name" text NOT NULL,
	"expansion_id" integer,
	"metacard_id" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cardmarket_prices_game_idx" ON "cardmarket_prices" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "cardmarket_products_game_match_name_idx" ON "cardmarket_products" USING btree ("game_id","match_name");