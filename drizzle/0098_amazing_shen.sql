ALTER TABLE "bin_sets" ADD COLUMN "repack_unique_by" text DEFAULT '$printing';--> statement-breakpoint
UPDATE "bin_sets" SET "repack_unique_by" = NULL WHERE "repack_allow_duplicates" = true;