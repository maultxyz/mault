CREATE TABLE "storage_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "storage_locations_guid_idx" UNIQUE("guid"),
	CONSTRAINT "storage_locations_org_name_idx" UNIQUE("org_id","name")
);
--> statement-breakpoint
ALTER TABLE "storage_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "is_chaos_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "location_position" integer;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_location_id_storage_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_cards_location_idx" ON "collection_cards" USING btree ("location_id","location_position");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "storage_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("storage_locations"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "storage_locations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("storage_locations"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "storage_locations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("storage_locations"."org_id")) WITH CHECK (("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("storage_locations"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "storage_locations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("storage_locations"."org_id"));