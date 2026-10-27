ALTER TABLE "collection_cards"
  ADD COLUMN "card_lang" text GENERATED ALWAYS AS ("collection_cards"."card" ->> 'lang') STORED,
  ADD COLUMN "has_alternative_matches" boolean GENERATED ALWAYS AS (COALESCE(jsonb_typeof("collection_cards"."alternative_matches") = 'array' AND jsonb_array_length("collection_cards"."alternative_matches") > 0, false)) STORED;--> statement-breakpoint
ANALYZE "collection_cards";
