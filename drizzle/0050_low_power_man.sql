ALTER TABLE "devices" ADD COLUMN "setup_completed_at" timestamp;--> statement-breakpoint
-- Existing sorters are already in use; only boards registered from now on start the setup wizard.
UPDATE "devices" SET "setup_completed_at" = now();
