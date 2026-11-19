ALTER TABLE "bin_sets" ADD COLUMN IF NOT EXISTS "fill_storage_location_ids" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "bins" ADD COLUMN IF NOT EXISTS "claimed_storage_location_id" integer;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "capacity" integer;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD COLUMN IF NOT EXISTS "batch_size" integer;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bins" ADD CONSTRAINT "bins_claimed_storage_location_id_storage_locations_id_fk" FOREIGN KEY ("claimed_storage_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
