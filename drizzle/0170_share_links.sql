CREATE TABLE "share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"link_kind" text NOT NULL,
	"collection_id" integer,
	"storage_location_id" integer,
	"subject_guid" uuid NOT NULL,
	"subject_version" integer NOT NULL,
	"purpose" text NOT NULL,
	"shows_prices" boolean NOT NULL,
	"issued_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_by_user_id" text NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "share_links_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "share_links_org_expires_idx" ON "share_links" USING btree ("org_id","expires_at");--> statement-breakpoint
CREATE INDEX "share_links_subject_idx" ON "share_links" USING btree ("subject_guid");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "share_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("share_links"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("share_links"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "share_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("share_links"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("share_links"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "share_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("share_links"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("share_links"."org_id")) WITH CHECK (("share_links"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("share_links"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "share_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("share_links"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("share_links"."org_id"));