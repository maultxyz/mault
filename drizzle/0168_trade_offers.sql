CREATE TABLE "trade_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"link_kind" text NOT NULL,
	"collection_id" integer,
	"storage_location_id" integer,
	"guest_name" text NOT NULL,
	"guest_contact" text NOT NULL,
	"guest_note" text,
	"guest_key_hash" text NOT NULL,
	"wanted_cards" jsonb NOT NULL,
	"offered_cards" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"responded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trade_offers_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "trade_offers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "trade_offers_org_status_idx" ON "trade_offers" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "trade_offers_guest_idx" ON "trade_offers" USING btree ("guest_key_hash");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "trade_offers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("trade_offers"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("trade_offers"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "trade_offers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("trade_offers"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("trade_offers"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "trade_offers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("trade_offers"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("trade_offers"."org_id")) WITH CHECK (("trade_offers"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("trade_offers"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "trade_offers" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("trade_offers"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("trade_offers"."org_id"));