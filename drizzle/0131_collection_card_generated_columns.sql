ALTER TABLE "collection_cards"
  ADD COLUMN IF NOT EXISTS "card_lang" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'lang') STORED,
  ADD COLUMN IF NOT EXISTS "card_name" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'name') STORED,
  ADD COLUMN IF NOT EXISTS "card_set" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'set') STORED,
  ADD COLUMN IF NOT EXISTS "card_set_name" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'setName') STORED,
  ADD COLUMN IF NOT EXISTS "card_rarity" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'rarity') STORED,
  ADD COLUMN IF NOT EXISTS "card_color_identity" jsonb GENERATED ALWAYS AS (CASE WHEN jsonb_typeof("collection_cards"."card" -> 'colorIdentity') = 'array' THEN "collection_cards"."card" -> 'colorIdentity' ELSE '[]'::jsonb END) STORED,
  ADD COLUMN IF NOT EXISTS "has_alternative_matches" boolean GENERATED ALWAYS AS (COALESCE(jsonb_typeof("collection_cards"."alternative_matches") = 'array' AND jsonb_array_length("collection_cards"."alternative_matches") > 0, false)) STORED;--> statement-breakpoint
ANALYZE "collection_cards";
