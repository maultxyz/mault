CREATE TABLE "card_price_history" (
	"game_key" text NOT NULL,
	"lang" text NOT NULL,
	"card_id" text NOT NULL,
	"day" date NOT NULL,
	"price_cents" integer,
	"price_foil_cents" integer,
	"price_eur_cents" integer,
	"price_eur_foil_cents" integer,
	"price_card_kingdom_cents" integer,
	"price_card_kingdom_foil_cents" integer,
	CONSTRAINT "card_price_history_game_key_lang_card_id_day_pk" PRIMARY KEY("game_key","lang","card_id","day")
);
--> statement-breakpoint
ALTER TABLE "card_price_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_price_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_price_history" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_price_history" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_price_history" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
INSERT INTO "card_price_history" ("game_key", "lang", "card_id", "day", "price_cents", "price_foil_cents", "price_eur_cents", "price_eur_foil_cents", "price_card_kingdom_cents", "price_card_kingdom_foil_cents")
SELECT "game_key", "lang", "card_id", ("updated_at" AT TIME ZONE 'UTC')::date,
  round("price" * 100)::integer, round("price_foil" * 100)::integer,
  round("price_eur" * 100)::integer, round("price_eur_foil" * 100)::integer,
  round("price_card_kingdom" * 100)::integer, round("price_card_kingdom_foil" * 100)::integer
FROM "card_prices"
ON CONFLICT DO NOTHING;
