CREATE TABLE "card_finish_vectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_key" text NOT NULL,
	"lang" text NOT NULL,
	"card_id" text NOT NULL,
	"foil_type" text NOT NULL,
	"product_id" integer NOT NULL,
	"embedding" vector(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_finish_vectors_card_finish_idx" UNIQUE("game_key","lang","card_id","foil_type")
);
--> statement-breakpoint
ALTER TABLE "card_finish_vectors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "card_finish_vectors" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "card_finish_vectors" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "card_finish_vectors" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "card_finish_vectors" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);