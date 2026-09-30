CREATE TABLE "sound_clips" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text,
	"data_url" text,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sound_clips_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "sound_clips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sound_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"game_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"rules" jsonb NOT NULL,
	"clip_id" integer,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sound_rules_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "sound_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sound_rules" ADD CONSTRAINT "sound_rules_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sound_rules" ADD CONSTRAINT "sound_rules_clip_id_sound_clips_id_fk" FOREIGN KEY ("clip_id") REFERENCES "public"."sound_clips"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sound_clips_org_idx" ON "sound_clips" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "sound_rules_org_game_idx" ON "sound_rules" USING btree ("org_id","game_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "sound_clips" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("sound_clips"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_clips"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "sound_clips" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("sound_clips"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_clips"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "sound_clips" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("sound_clips"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_clips"."org_id")) WITH CHECK (("sound_clips"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_clips"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "sound_clips" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("sound_clips"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_clips"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "sound_rules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("sound_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "sound_rules" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("sound_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "sound_rules" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("sound_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_rules"."org_id")) WITH CHECK (("sound_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_rules"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "sound_rules" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("sound_rules"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("sound_rules"."org_id"));