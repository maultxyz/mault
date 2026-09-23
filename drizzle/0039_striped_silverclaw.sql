CREATE TABLE "cards_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"card_id" text NOT NULL,
	"game_key" text DEFAULT 'mtg' NOT NULL,
	"lang" text DEFAULT 'en' NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"embedding" vector(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cards_v2_game_lang_card_idx" UNIQUE("game_key","lang","card_id")
);
--> statement-breakpoint
ALTER TABLE "cards_v2" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "cards_v2" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "cards_v2" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "cards_v2" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "cards_v2" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);