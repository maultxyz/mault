UPDATE "bin_heights" SET "height" = 60, "updated_at" = now() WHERE "height" = 69;
--> statement-breakpoint
UPDATE "bin_height_audit" SET "height" = 60 WHERE "height" = 69;
