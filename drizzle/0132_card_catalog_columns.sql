ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "set_name" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "rarity" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "color_identity" jsonb;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "search_text" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "image_small" text;--> statement-breakpoint
GRANT SELECT ON "cards" TO api_service;--> statement-breakpoint
DROP POLICY IF EXISTS "api-service-policy-select" ON "cards";--> statement-breakpoint
CREATE POLICY "api-service-policy-select" ON "cards" AS PERMISSIVE FOR SELECT TO "api_service" USING (true);
