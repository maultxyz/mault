CREATE TABLE "platform_match_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_id" uuid NOT NULL,
	"org_id" text NOT NULL,
	"game_key" text,
	"card_id" text NOT NULL,
	"card_lang" text,
	"captured_image_key" text,
	"is_correct_match" boolean NOT NULL,
	"matched_by" text,
	"low_confidence_match" boolean NOT NULL,
	"validated_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_match_validations_scan_user_idx" UNIQUE("scan_id","validated_by_user_id")
);
--> statement-breakpoint
ALTER TABLE "platform_match_validations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "platform_match_validations_scan_idx" ON "platform_match_validations" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "platform_match_validations_user_idx" ON "platform_match_validations" USING btree ("validated_by_user_id");--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "platform_match_validations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "platform_match_validations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "platform_match_validations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "platform_match_validations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);