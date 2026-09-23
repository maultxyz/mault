CREATE TABLE "bin_height_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"bin_number" integer NOT NULL,
	"height" double precision NOT NULL,
	"org_id" text NOT NULL,
	"device_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_height_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "bin_height_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bin_heights" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"bin_number" integer NOT NULL,
	"height" double precision NOT NULL,
	"org_id" text NOT NULL,
	"device_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_heights_device_bin_idx" UNIQUE("device_id","bin_number")
);
--> statement-breakpoint
ALTER TABLE "bin_heights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "card_thickness" double precision;--> statement-breakpoint
ALTER TABLE "bin_heights" ADD CONSTRAINT "bin_heights_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_height_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_height_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_height_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_height_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_height_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_height_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_height_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_height_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_height_audit"."org_id")) WITH CHECK (("bin_height_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_height_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_height_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_height_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_height_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_heights" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_heights"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_heights"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_heights" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_heights"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_heights"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_heights" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_heights"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_heights"."org_id")) WITH CHECK (("bin_heights"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_heights"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_heights" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_heights"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_heights"."org_id"));