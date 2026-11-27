CREATE TABLE "pi_host_pairings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"poll_secret_hash" text NOT NULL,
	"host_name" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"pi_host_id" integer,
	"claimed_at" timestamp,
	"token_delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pi_host_pairings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "pi_hosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text,
	"paired_by" text NOT NULL,
	"paired_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	"active_scan_user_id" text,
	"active_scan_started_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pi_hosts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "pi_host_pairings_code_idx" ON "pi_host_pairings" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "pi_hosts_guid_idx" ON "pi_hosts" USING btree ("guid");--> statement-breakpoint
CREATE UNIQUE INDEX "pi_hosts_token_hash_idx" ON "pi_hosts" USING btree ("token_hash") WHERE "pi_hosts"."token_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "pi_hosts_org_idx" ON "pi_hosts" USING btree ("org_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "pi_hosts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("pi_hosts"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "pi_hosts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("pi_hosts"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "pi_hosts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("pi_hosts"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id'))) WITH CHECK (("pi_hosts"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "pi_hosts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("pi_hosts"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));