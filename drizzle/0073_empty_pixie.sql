CREATE TABLE "notification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"game_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"rules" jsonb NOT NULL,
	"integration" text DEFAULT 'discord' NOT NULL,
	"channel_id" text,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_rules_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "notification_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_rules_org_game_idx" ON "notification_rules" USING btree ("org_id","game_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "notification_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("notification_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "notification_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("notification_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "notification_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("notification_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_rules"."org_id")) WITH CHECK (("notification_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "notification_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("notification_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_rules"."org_id"));