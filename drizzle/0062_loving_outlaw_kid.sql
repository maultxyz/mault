CREATE TABLE "scan_stats" (
	"scan_id" uuid PRIMARY KEY NOT NULL,
	"outcome" text NOT NULL,
	"match_percent" double precision,
	"has_alternatives" boolean DEFAULT false NOT NULL,
	"is_corrected" boolean DEFAULT false NOT NULL,
	"vectorized_on" text,
	"scanned_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
INSERT INTO "scan_stats" ("scan_id", "outcome", "match_percent", "has_alternatives", "is_corrected", "scanned_at")
SELECT
	"guid",
	'matched',
	CASE WHEN jsonb_typeof("card" -> 'distance') = 'number' THEN
		greatest(0, least(100, coalesce(
			("card" ->> 'confidence')::double precision,
			1 - ("card" ->> 'distance')::double precision
		) * 100))
	END,
	"alternative_matches" IS NOT NULL,
	"is_corrected",
	"scanned_at"
FROM "collection_cards"
WHERE "guid" IS NOT NULL
ON CONFLICT ("scan_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "scan_stats" ("scan_id", "outcome", "scanned_at")
SELECT "guid", 'unmatched', "scanned_at"
FROM "unmatched_cards"
WHERE "guid" IS NOT NULL
ON CONFLICT ("scan_id") DO NOTHING;
