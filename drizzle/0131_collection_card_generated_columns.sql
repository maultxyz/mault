ALTER TABLE "collection_cards"
  ADD COLUMN IF NOT EXISTS "card_lang" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'lang') STORED,
  ADD COLUMN IF NOT EXISTS "card_name" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'name') STORED,
  ADD COLUMN IF NOT EXISTS "card_set" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'set') STORED,
  ADD COLUMN IF NOT EXISTS "card_set_name" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'setName') STORED,
  ADD COLUMN IF NOT EXISTS "card_rarity" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'rarity') STORED,
  ADD COLUMN IF NOT EXISTS "card_color_identity" jsonb GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'colorIdentity') = 'array' THEN "collection_cards"."card" -> 'colorIdentity' ELSE '[]'::jsonb END) STORED,
  ADD COLUMN IF NOT EXISTS "card_search_text" text GENERATED ALWAYS AS (lower(COALESCE("collection_cards"."card" ->> 'name', '') || chr(10) || COALESCE("collection_cards"."card" ->> 'setName', '') || chr(10) || COALESCE("collection_cards"."card" ->> 'set', '') || chr(10) || COALESCE("collection_cards"."card" ->> 'typeLine', '') || chr(10) || COALESCE("collection_cards"."card" ->> 'collectorNumber', '') || chr(10) || COALESCE("collection_cards"."card" ->> 'text', ''))) STORED,
  ADD COLUMN IF NOT EXISTS "card_image_small" text GENERATED ALWAYS AS ("collection_cards"."card" -> 'image' ->> 'small') STORED,
  ADD COLUMN IF NOT EXISTS "card_collector_number" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'collectorNumber') STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'price') = 'number' THEN ("collection_cards"."card" ->> 'price')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price_foil" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'priceFoil') = 'number' THEN ("collection_cards"."card" ->> 'priceFoil')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price_eur" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'priceEur') = 'number' THEN ("collection_cards"."card" ->> 'priceEur')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price_eur_foil" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'priceEurFoil') = 'number' THEN ("collection_cards"."card" ->> 'priceEurFoil')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price_card_kingdom" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'priceCardKingdom') = 'number' THEN ("collection_cards"."card" ->> 'priceCardKingdom')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "card_saved_price_card_kingdom_foil" double precision GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'priceCardKingdomFoil') = 'number' THEN ("collection_cards"."card" ->> 'priceCardKingdomFoil')::float8 END) STORED,
  ADD COLUMN IF NOT EXISTS "has_alternative_matches" boolean GENERATED ALWAYS AS (COALESCE(jsonb_typeof("collection_cards"."alternative_matches") = 'array' AND jsonb_array_length("collection_cards"."alternative_matches") > 0, false)) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_cards_org_created_idx" ON "collection_cards" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_cards_collection_card_idx" ON "collection_cards" USING btree ("collection_id","card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_cards_org_card_name_idx" ON "collection_cards" USING btree ("org_id",lower("card_name"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_cards_org_card_front_name_idx" ON "collection_cards" USING btree ("org_id",lower(split_part("card_name", ' // ', 1)));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_stats_org_scanned_idx" ON "scan_stats" USING btree ("org_id","scanned_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_stats_created_idx" ON "scan_stats" USING btree ("created_at");--> statement-breakpoint
DROP INDEX IF EXISTS "scan_stats_org_idx";--> statement-breakpoint
ANALYZE "collection_cards";--> statement-breakpoint
ANALYZE "scan_stats";
