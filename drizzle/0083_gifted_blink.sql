CREATE TABLE IF NOT EXISTS "plan_settings" (
	"plan" text PRIMARY KEY NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-select" ON "plan_settings";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "plan_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-insert" ON "plan_settings";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "plan_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-update" ON "plan_settings";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "plan_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
DROP POLICY IF EXISTS "crud-authenticated-policy-delete" ON "plan_settings";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "plan_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);