CREATE TABLE "card_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"collection_card_id" integer NOT NULL,
	"guest_name" text NOT NULL,
	"guest_note" text,
	"guest_key_hash" text NOT NULL,
	"share_link_kind" text NOT NULL,
	"expires_at" timestamp,
	"approved_at" timestamp,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_holds_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "card_holds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "card_holds" ADD CONSTRAINT "card_holds_collection_card_id_collection_cards_id_fk" FOREIGN KEY ("collection_card_id") REFERENCES "public"."collection_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_holds_card_idx" ON "card_holds" USING btree ("collection_card_id");--> statement-breakpoint
CREATE INDEX "card_holds_org_idx" ON "card_holds" USING btree ("org_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_holds" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("card_holds"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_holds"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_holds" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("card_holds"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_holds"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_holds" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("card_holds"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_holds"."org_id")) WITH CHECK (("card_holds"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_holds"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_holds" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("card_holds"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("card_holds"."org_id"));