CREATE TABLE "printing_mark_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_key" text NOT NULL,
	"region_key" text NOT NULL,
	"group_key" text NOT NULL,
	"card_count" integer NOT NULL,
	"sums" real[] NOT NULL,
	"squares" real[] NOT NULL,
	"version" smallint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "printing_mark_references_group_idx" UNIQUE("game_key","region_key","group_key")
);
--> statement-breakpoint
ALTER TABLE "printing_mark_references" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "printing_mark_groups" jsonb;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "printing_mark_version" smallint;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD COLUMN IF NOT EXISTS "stamp" text;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "printing_mark_references" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "printing_mark_references" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "printing_mark_references" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "printing_mark_references" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);