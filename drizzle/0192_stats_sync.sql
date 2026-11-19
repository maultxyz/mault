CREATE TABLE "self_hosted_daily_scan_stats" (
	"org_id" text NOT NULL,
	"day" date NOT NULL,
	"scan_count" integer NOT NULL,
	"matched_count" integer NOT NULL,
	"unmatched_count" integer NOT NULL,
	"corrected_count" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "self_hosted_daily_scan_stats_org_id_day_pk" PRIMARY KEY("org_id","day")
);
--> statement-breakpoint
ALTER TABLE "self_hosted_daily_scan_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stats_sync_connections" (
	"org_id" text PRIMARY KEY NOT NULL,
	"sync_key" text NOT NULL,
	"key_prefix" text NOT NULL,
	"connected_by" text NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"last_attempt_at" timestamp,
	"last_error_code" text,
	"synced_scan_count" integer
);
--> statement-breakpoint
ALTER TABLE "stats_sync_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stats_sync_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "stats_sync_keys_hash_idx" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "stats_sync_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "stats_sync_keys_live_org_idx" ON "stats_sync_keys" USING btree ("org_id") WHERE "stats_sync_keys"."revoked_at" IS NULL;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "self_hosted_daily_scan_stats" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("self_hosted_daily_scan_stats"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "self_hosted_daily_scan_stats" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "self_hosted_daily_scan_stats" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "self_hosted_daily_scan_stats" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "stats_sync_connections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "stats_sync_connections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "stats_sync_connections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "stats_sync_connections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "stats_sync_keys" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("stats_sync_keys"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "stats_sync_keys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("stats_sync_keys"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "stats_sync_keys" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("stats_sync_keys"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id'))) WITH CHECK (("stats_sync_keys"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "stats_sync_keys" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("stats_sync_keys"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));