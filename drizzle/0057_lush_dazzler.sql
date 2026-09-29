CREATE TABLE "org_daily_scan_usage" (
	"org_id" text NOT NULL,
	"day" date NOT NULL,
	"scan_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_daily_scan_usage_org_id_day_pk" PRIMARY KEY("org_id","day")
);
--> statement-breakpoint
ALTER TABLE "org_daily_scan_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_daily_scan_usage" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_daily_scan_usage"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_daily_scan_usage"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_daily_scan_usage" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_daily_scan_usage" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_daily_scan_usage" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
INSERT INTO "org_daily_scan_usage" ("org_id", "day", "scan_count")
SELECT "org_id", "scanned_at"::date, count(*)::int
FROM "collection_cards"
GROUP BY "org_id", "scanned_at"::date
ON CONFLICT DO NOTHING;
