CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secret" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"disabled_at" timestamp,
	"disabled_reason" text,
	"last_delivery_at" timestamp,
	"last_status" integer,
	"last_error" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "webhook_endpoints_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "webhook_endpoints_org_idx" ON "webhook_endpoints" USING btree ("org_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "webhook_endpoints" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("webhook_endpoints"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("webhook_endpoints"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "webhook_endpoints" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("webhook_endpoints"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("webhook_endpoints"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "webhook_endpoints" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("webhook_endpoints"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("webhook_endpoints"."org_id")) WITH CHECK (("webhook_endpoints"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("webhook_endpoints"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "webhook_endpoints" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("webhook_endpoints"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("webhook_endpoints"."org_id"));