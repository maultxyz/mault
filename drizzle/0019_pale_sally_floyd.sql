CREATE TABLE "unmatched_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"collection_id" integer NOT NULL,
	"captured_image_data_url" text,
	"scanned_at" timestamp NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unmatched_cards_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "unmatched_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "unmatched_cards" ADD CONSTRAINT "unmatched_cards_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "unmatched_cards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("unmatched_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("unmatched_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "unmatched_cards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("unmatched_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("unmatched_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "unmatched_cards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("unmatched_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("unmatched_cards"."org_id")) WITH CHECK (("unmatched_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("unmatched_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "unmatched_cards" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("unmatched_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("unmatched_cards"."org_id"));