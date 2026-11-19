CREATE TEMP TABLE "yugioh_printing_ids" AS
SELECT
  c."lang",
  c."card_id" AS "legacy_card_id",
  (c."data" ->> 'id') || '_' || (c."data" -> 'card_sets' -> 0 ->> 'set_code') || '_' ||
    trim(both '-' from regexp_replace(lower(c."data" -> 'card_sets' -> 0 ->> 'set_rarity'), '[^a-z0-9]+', '-', 'g'))
    AS "printing_card_id",
  c."card_id" = c."data" ->> 'id' AS "is_main_artwork"
FROM "cards" c
WHERE c."game_key" = 'yugioh'
  AND c."card_id" ~ '^[0-9]+$'
  AND c."data" ->> 'id' IS NOT NULL
  AND jsonb_typeof(c."data" -> 'card_sets') = 'array'
  AND jsonb_array_length(c."data" -> 'card_sets') > 0
  AND c."data" -> 'card_sets' -> 0 ->> 'set_code' IS NOT NULL;
--> statement-breakpoint
UPDATE "collection_cards" cc
SET
  "card_id" = m."printing_card_id",
  "card" = jsonb_set(cc."card", '{id}', to_jsonb(m."printing_card_id"))
FROM "yugioh_printing_ids" m, "collections" col, "games" g
WHERE cc."card_id" = m."legacy_card_id"
  AND col."id" = cc."collection_id"
  AND g."id" = col."game_id"
  AND g."key" = 'yugioh'
  AND m."lang" = COALESCE(NULLIF(cc."card" ->> 'lang', ''), 'en');
--> statement-breakpoint
UPDATE "collection_cards" cc
SET "alternative_matches" = (
  SELECT jsonb_agg(
    CASE
      WHEN m."printing_card_id" IS NULL THEN a."alternative"
      ELSE jsonb_set(a."alternative", '{id}', to_jsonb(m."printing_card_id"))
    END
    ORDER BY a."position"
  )
  FROM jsonb_array_elements(cc."alternative_matches") WITH ORDINALITY AS a("alternative", "position")
  LEFT JOIN "yugioh_printing_ids" m
    ON m."legacy_card_id" = a."alternative" ->> 'id'
    AND m."lang" = COALESCE(NULLIF(a."alternative" ->> 'lang', ''), 'en')
)
FROM "collections" col, "games" g
WHERE col."id" = cc."collection_id"
  AND g."id" = col."game_id"
  AND g."key" = 'yugioh'
  AND jsonb_typeof(cc."alternative_matches") = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(cc."alternative_matches") AS e("alternative")
    JOIN "yugioh_printing_ids" m ON m."legacy_card_id" = e."alternative" ->> 'id'
  );
--> statement-breakpoint
UPDATE "platform_match_validations" v
SET "card_id" = m."printing_card_id"
FROM "yugioh_printing_ids" m
WHERE v."game_key" = 'yugioh'
  AND v."card_id" = m."legacy_card_id"
  AND m."lang" = COALESCE(v."card_lang", 'en');
--> statement-breakpoint
UPDATE "platform_foil_labels" f
SET "card_id" = m."printing_card_id"
FROM "yugioh_printing_ids" m
WHERE f."game_key" = 'yugioh'
  AND f."card_id" = m."legacy_card_id"
  AND m."lang" = COALESCE(f."card_lang", 'en');
--> statement-breakpoint
UPDATE "card_prices" p
SET "card_id" = m."printing_card_id"
FROM "yugioh_printing_ids" m
WHERE p."game_key" = 'yugioh'
  AND p."lang" = m."lang"
  AND p."card_id" = m."legacy_card_id"
  AND m."is_main_artwork"
  AND NOT EXISTS (
    SELECT 1 FROM "card_prices" x
    WHERE x."game_key" = 'yugioh' AND x."lang" = m."lang" AND x."card_id" = m."printing_card_id"
  );
--> statement-breakpoint
DELETE FROM "card_prices" p
USING "yugioh_printing_ids" m
WHERE p."game_key" = 'yugioh'
  AND p."lang" = m."lang"
  AND p."card_id" = m."legacy_card_id";
--> statement-breakpoint
UPDATE "cards" c
SET "card_id" = m."printing_card_id", "updated_at" = now()
FROM "yugioh_printing_ids" m
WHERE c."game_key" = 'yugioh'
  AND c."lang" = m."lang"
  AND c."card_id" = m."legacy_card_id"
  AND m."is_main_artwork"
  AND NOT EXISTS (
    SELECT 1 FROM "cards" x
    WHERE x."game_key" = 'yugioh' AND x."lang" = m."lang" AND x."card_id" = m."printing_card_id"
  );
--> statement-breakpoint
DELETE FROM "cards" c
USING "yugioh_printing_ids" m
WHERE c."game_key" = 'yugioh'
  AND c."lang" = m."lang"
  AND c."card_id" = m."legacy_card_id";
--> statement-breakpoint
DROP TABLE "yugioh_printing_ids";
