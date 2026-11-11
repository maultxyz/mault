CREATE TABLE "shop_catalogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"org_id" text NOT NULL,
	"collection_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"storage_location_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"shows_prices" boolean DEFAULT true NOT NULL,
	"share_link_version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_catalogs_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "shop_catalogs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "shop_catalogs_org_idx" ON "shop_catalogs" USING btree ("org_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "shop_catalogs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("shop_catalogs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("shop_catalogs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "shop_catalogs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("shop_catalogs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("shop_catalogs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "shop_catalogs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("shop_catalogs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("shop_catalogs"."org_id")) WITH CHECK (("shop_catalogs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("shop_catalogs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "shop_catalogs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("shop_catalogs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("shop_catalogs"."org_id"));