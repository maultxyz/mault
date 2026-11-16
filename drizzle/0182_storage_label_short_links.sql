ALTER TABLE "storage_locations" ADD COLUMN "label_short_code" text;--> statement-breakpoint
UPDATE "storage_locations" SET "label_short_code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "label_short_code" IS NULL;--> statement-breakpoint
ALTER TABLE "storage_locations" ALTER COLUMN "label_short_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_label_short_code_idx" UNIQUE("label_short_code");
