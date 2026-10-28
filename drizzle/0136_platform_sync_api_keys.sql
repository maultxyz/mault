CREATE TABLE "platform_sync_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"permissions" text[] NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"revoked_at" timestamp,
	CONSTRAINT "platform_sync_api_keys_guid_idx" UNIQUE("guid"),
	CONSTRAINT "platform_sync_api_keys_hash_idx" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "platform_sync_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "platform_sync_api_keys" AS PERMISSIVE FOR SELECT TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "platform_sync_api_keys" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "platform_sync_api_keys" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "platform_sync_api_keys" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);