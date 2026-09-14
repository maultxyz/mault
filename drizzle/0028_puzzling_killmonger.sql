CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"org_id" text NOT NULL,
	"name" text DEFAULT 'Card Sorter' NOT NULL,
	"scan_coverage" integer,
	"scan_offset_x" integer,
	"scan_offset_y" integer,
	"capture_settle_delay_ms" integer,
	"module_count" integer DEFAULT 3 NOT NULL,
	"channel_layout" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "devices_org_idx" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bin_route_audit" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "bin_routes" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "feeder_config_audit" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "feeder_configs" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "module_config_audit" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "module_configs" ADD COLUMN "device_id" integer;--> statement-breakpoint
ALTER TABLE "bin_routes" ADD CONSTRAINT "bin_routes_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feeder_configs" ADD CONSTRAINT "feeder_configs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module_configs" ADD CONSTRAINT "module_configs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "devices" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("devices"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("devices"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "devices" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("devices"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("devices"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "devices" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("devices"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("devices"."org_id")) WITH CHECK (("devices"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("devices"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "devices" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("devices"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("devices"."org_id"));