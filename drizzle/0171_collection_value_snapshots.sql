CREATE TABLE "collection_value_snapshots" (
	"org_id" text NOT NULL,
	"collection_guid" uuid NOT NULL,
	"day" date NOT NULL,
	"card_count" integer DEFAULT 0 NOT NULL,
	"market_value" double precision DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_value_snapshots_collection_guid_day_pk" PRIMARY KEY("collection_guid","day")
);
--> statement-breakpoint
ALTER TABLE "collection_value_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "collection_value_snapshots_org_day_idx" ON "collection_value_snapshots" USING btree ("org_id","day");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "collection_value_snapshots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("collection_value_snapshots"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_value_snapshots"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "collection_value_snapshots" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "collection_value_snapshots" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "collection_value_snapshots" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);