CREATE TABLE "preset_workflow_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"workflow_id" integer NOT NULL,
	"parent_step_guid" uuid,
	"parent_bin_number" integer,
	"preset_guid" uuid NOT NULL,
	"is_resort_mode" boolean DEFAULT true NOT NULL,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preset_workflow_steps_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "preset_workflow_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "preset_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"folder_name" text,
	"game_id" integer,
	"is_active" boolean DEFAULT false NOT NULL,
	"active_step_guid" uuid,
	"org_id" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "preset_workflows_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "preset_workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "bin_sets_parent_bin_idx";--> statement-breakpoint
ALTER TABLE "preset_workflow_steps" ADD CONSTRAINT "preset_workflow_steps_workflow_id_preset_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."preset_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preset_workflows" ADD CONSTRAINT "preset_workflows_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "preset_workflow_steps_workflow_idx" ON "preset_workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "preset_workflow_steps_root_idx" ON "preset_workflow_steps" USING btree ("workflow_id") WHERE "preset_workflow_steps"."is_deleted" = false AND "preset_workflow_steps"."parent_step_guid" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "preset_workflow_steps_parent_bin_idx" ON "preset_workflow_steps" USING btree ("parent_step_guid","parent_bin_number") WHERE "preset_workflow_steps"."is_deleted" = false AND "preset_workflow_steps"."parent_step_guid" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "preset_workflows_org_game_idx" ON "preset_workflows" USING btree ("org_id","game_id");--> statement-breakpoint
ALTER TABLE "bin_sets" DROP COLUMN "parent_guid";--> statement-breakpoint
ALTER TABLE "bin_sets" DROP COLUMN "parent_bin_number";--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "preset_workflow_steps" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("preset_workflow_steps"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflow_steps"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "preset_workflow_steps" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("preset_workflow_steps"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflow_steps"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "preset_workflow_steps" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("preset_workflow_steps"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflow_steps"."org_id")) WITH CHECK (("preset_workflow_steps"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflow_steps"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "preset_workflow_steps" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("preset_workflow_steps"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflow_steps"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "preset_workflows" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("preset_workflows"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflows"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "preset_workflows" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("preset_workflows"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflows"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "preset_workflows" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("preset_workflows"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflows"."org_id")) WITH CHECK (("preset_workflows"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflows"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "preset_workflows" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("preset_workflows"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("preset_workflows"."org_id"));