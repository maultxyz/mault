ALTER TABLE "share_links" ADD COLUMN "short_code" text;--> statement-breakpoint
ALTER TABLE "shop_catalogs" ADD COLUMN "short_code" text;--> statement-breakpoint
UPDATE "share_links" SET "short_code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "short_code" IS NULL;--> statement-breakpoint
UPDATE "shop_catalogs" SET "short_code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "short_code" IS NULL;--> statement-breakpoint
ALTER TABLE "share_links" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shop_catalogs" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_short_code_idx" UNIQUE("short_code");--> statement-breakpoint
ALTER TABLE "shop_catalogs" ADD CONSTRAINT "shop_catalogs_short_code_idx" UNIQUE("short_code");
