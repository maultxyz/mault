DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_service') THEN
    CREATE ROLE api_service NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;--> statement-breakpoint
GRANT api_service TO CURRENT_USER;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO api_service;--> statement-breakpoint
GRANT SELECT ON "collection_cards", "collections", "storage_locations", "games", "card_prices", "org_settings" TO api_service;--> statement-breakpoint
CREATE TABLE "org_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scope" text DEFAULT 'read' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "org_api_keys_guid_idx" UNIQUE("guid"),
	CONSTRAINT "org_api_keys_hash_idx" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "org_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "org_api_keys_org_idx" ON "org_api_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "collection_cards_org_updated_idx" ON "collection_cards" USING btree ("org_id","updated_at","id");--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "card_prices" AS PERMISSIVE FOR SELECT TO "api_service" USING (true);--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "collection_cards" AS PERMISSIVE FOR SELECT TO "api_service" USING ("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "collections" AS PERMISSIVE FOR SELECT TO "api_service" USING ("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "games" AS PERMISSIVE FOR SELECT TO "api_service" USING (true);--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "org_settings" AS PERMISSIVE FOR SELECT TO "api_service" USING ("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "storage_locations" AS PERMISSIVE FOR SELECT TO "api_service" USING ("storage_locations"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id'));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_api_keys" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_api_keys"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_api_keys"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_api_keys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("org_api_keys"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_api_keys"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_api_keys" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("org_api_keys"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_api_keys"."org_id")) WITH CHECK (("org_api_keys"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_api_keys"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_api_keys" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("org_api_keys"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_api_keys"."org_id"));
--> statement-breakpoint
CREATE OR REPLACE FUNCTION collection_cards_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER collection_cards_touch_updated_at
BEFORE UPDATE ON "collection_cards"
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION collection_cards_touch_updated_at();
