UPDATE "games" SET "field_definitions" = (
  SELECT jsonb_agg(
    CASE
      WHEN f ->> 'type' IN ('enum', 'set')
        AND NOT COALESCE(f -> 'operators', '[]'::jsonb) @> '[{"value": "count_gt"}]'::jsonb
      THEN jsonb_set(
        f,
        '{operators}',
        COALESCE(f -> 'operators', '[]'::jsonb) || '[
          {"value": "count_equals", "label": "item count equals"},
          {"value": "count_gt", "label": "item count greater than"},
          {"value": "count_lt", "label": "item count less than"}
        ]'::jsonb
      )
      ELSE f
    END
    ORDER BY ord
  )
  FROM jsonb_array_elements("field_definitions") WITH ORDINALITY AS e(f, ord)
)
WHERE jsonb_typeof("field_definitions") = 'array'
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements("field_definitions") AS d(f)
    WHERE f ->> 'type' IN ('enum', 'set')
      AND NOT COALESCE(f -> 'operators', '[]'::jsonb) @> '[{"value": "count_gt"}]'::jsonb
  );
