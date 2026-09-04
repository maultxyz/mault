CREATE TABLE "org_billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_billing_org_idx" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "org_billing" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_billing" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_billing"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_billing"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_billing" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("org_billing"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_billing"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_billing" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("org_billing"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_billing"."org_id")) WITH CHECK (("org_billing"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_billing"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_billing" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("org_billing"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_billing"."org_id"));