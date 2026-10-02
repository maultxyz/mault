UPDATE "bins"
SET "rules" = jsonb_set("rules", '{conditions}', '[]'::jsonb)
WHERE "is_catch_all" = true
  AND jsonb_typeof("rules") = 'object'
  AND jsonb_typeof("rules"->'conditions') = 'array'
  AND jsonb_array_length("rules"->'conditions') > 0;
