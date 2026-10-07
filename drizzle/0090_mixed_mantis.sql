ALTER TABLE "bins" ADD COLUMN "override_priority" integer;--> statement-breakpoint
ALTER TABLE "bins" ADD COLUMN "low_match_percent" double precision;--> statement-breakpoint
UPDATE "bins"
SET "low_match_percent" = ("rules"->'conditions'->0->>'value')::double precision,
	"rules" = jsonb_set("rules", '{conditions}', '[]'::jsonb)
WHERE "is_catch_all" = true
	AND jsonb_typeof("rules"->'conditions') = 'array'
	AND jsonb_array_length("rules"->'conditions') = 1
	AND "rules"->'conditions'->0->>'field' = 'matchPercent'
	AND "rules"->'conditions'->0->>'operator' = 'lt'
	AND "rules"->'conditions'->0->>'value' ~ '^[0-9]+(\.[0-9]+)?$';
