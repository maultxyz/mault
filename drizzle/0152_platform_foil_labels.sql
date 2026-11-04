CREATE TABLE "platform_foil_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"game_key" text,
	"card_id" text NOT NULL,
	"card_lang" text,
	"captured_image_key" text,
	"is_foil" boolean NOT NULL,
	"saved_is_foil" boolean NOT NULL,
	"saved_foil_type" text,
	"foil_score" double precision,
	"labelled_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_foil_labels_scan_id_idx" UNIQUE("scan_id")
);
--> statement-breakpoint
ALTER TABLE "platform_foil_labels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "platform_foil_labels" AS PERMISSIVE FOR SELECT TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "platform_foil_labels" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "platform_foil_labels" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "platform_foil_labels" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);