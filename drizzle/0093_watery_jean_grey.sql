CREATE TABLE "card_prices" (
	"game_key" text NOT NULL,
	"lang" text NOT NULL,
	"card_id" text NOT NULL,
	"price" double precision,
	"price_foil" double precision,
	"price_eur" double precision,
	"price_eur_foil" double precision,
	"details" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_prices_game_key_lang_card_id_pk" PRIMARY KEY("game_key","lang","card_id")
);
--> statement-breakpoint
ALTER TABLE "card_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_prices" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_prices" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_prices" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_prices" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);