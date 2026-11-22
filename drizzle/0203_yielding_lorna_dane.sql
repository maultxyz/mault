CREATE TABLE "card_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"shop_catalog_id" integer NOT NULL,
	"collection_card_id" integer NOT NULL,
	"card" jsonb NOT NULL,
	"guest_name" text NOT NULL,
	"guest_contact" text NOT NULL,
	"guest_note" text,
	"guest_key_hash" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"hold_days" integer NOT NULL,
	"hold_started_at" timestamp,
	"hold_expires_at" timestamp,
	"closed_at" timestamp,
	"closed_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_reservations_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "card_reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shop_catalogs" ADD COLUMN "allows_reservations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_catalogs" ADD COLUMN "reservation_hold_days" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
CREATE INDEX "card_reservations_org_active_idx" ON "card_reservations" USING btree ("org_id","collection_card_id") WHERE "card_reservations"."status" IN ('waiting', 'ready');--> statement-breakpoint
CREATE UNIQUE INDEX "card_reservations_card_holder_idx" ON "card_reservations" USING btree ("collection_card_id") WHERE "card_reservations"."status" = 'ready';--> statement-breakpoint
CREATE INDEX "card_reservations_org_closed_idx" ON "card_reservations" USING btree ("org_id","closed_at");--> statement-breakpoint
CREATE INDEX "card_reservations_guest_idx" ON "card_reservations" USING btree ("guest_key_hash");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_reservations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("card_reservations"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_reservations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("card_reservations"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_reservations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("card_reservations"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id'))) WITH CHECK (("card_reservations"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_reservations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("card_reservations"."org_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND (SELECT auth_is_org_member(current_setting('request.jwt.claims', true)::json ->> 'org_id')));