CREATE TABLE "import_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"mapping" jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "import_templates_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "import_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "import_templates_org_type_name_idx" ON "import_templates" USING btree ("org_id","type",lower("name")) WHERE "import_templates"."is_deleted" = false;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "import_templates" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("import_templates"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("import_templates"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "import_templates" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("import_templates"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("import_templates"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "import_templates" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("import_templates"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("import_templates"."org_id")) WITH CHECK (("import_templates"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("import_templates"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "import_templates" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("import_templates"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("import_templates"."org_id"));