UPDATE "games"
SET "foil_types" = "foil_types" || COALESCE((
    SELECT jsonb_agg(finish ORDER BY position)
    FROM jsonb_array_elements_text('[
      "Reverse Holo (Poké Ball)",
      "Reverse Holo (Master Ball)",
      "Reverse Holo (Energy Symbol)",
      "Reverse Holo (Friend Ball)",
      "Reverse Holo (Dusk Ball)",
      "Reverse Holo (Love Ball)",
      "Reverse Holo (Quick Ball)",
      "Reverse Holo (Team Rocket)",
      "Reverse Holo (Cosmos)",
      "Reverse Holo (Cracked Ice)",
      "Reverse Holo (League Stamp)",
      "Holo (Cosmos)",
      "Holo (Cracked Ice)",
      "Holo (Galaxy)",
      "Holo (Rainbow)",
      "Holo (Gold)"
    ]'::jsonb) WITH ORDINALITY AS finishes(finish, position)
    WHERE NOT ("games"."foil_types" ? finish)
  ), '[]'::jsonb),
  "updated_at" = now()
WHERE "key" = 'pokemon' AND "is_deleted" = false;
