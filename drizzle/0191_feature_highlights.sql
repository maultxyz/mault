CREATE TABLE "feature_highlight_views" (
	"user_id" text NOT NULL,
	"highlight_id" text NOT NULL,
	"seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_highlight_views_user_highlight_pk" PRIMARY KEY("user_id","highlight_id")
);
--> statement-breakpoint
ALTER TABLE "feature_highlight_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feature_highlights" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"slides" jsonb NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feature_highlights_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "feature_highlights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "feature_highlight_views" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("feature_highlight_views"."user_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'sub'));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "feature_highlight_views" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("feature_highlight_views"."user_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'sub'));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "feature_highlight_views" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("feature_highlight_views"."user_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'sub')) WITH CHECK ("feature_highlight_views"."user_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'sub'));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "feature_highlight_views" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("feature_highlight_views"."user_id" = (SELECT current_setting('request.jwt.claims', true)::json ->> 'sub'));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "feature_highlights" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "feature_highlights" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "feature_highlights" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "feature_highlights" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);