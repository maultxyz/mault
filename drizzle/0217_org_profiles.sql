CREATE TABLE "org_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"showcase_collection_card_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"shop_catalog_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"shows_prices" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_profiles_org_idx" UNIQUE("org_id"),
	CONSTRAINT "org_profiles_handle_idx" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "org_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_profiles"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("org_profiles"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("org_profiles"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id'))) WITH CHECK (("org_profiles"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("org_profiles"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));