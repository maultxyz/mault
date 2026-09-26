ALTER TABLE "devices" ADD COLUMN "setup_completed_at" timestamp;--> statement-breakpoint
UPDATE "devices" SET "setup_completed_at" = now();
