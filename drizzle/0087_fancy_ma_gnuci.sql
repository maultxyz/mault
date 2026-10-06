ALTER TABLE "devices" DROP CONSTRAINT "devices_org_hardware_idx";--> statement-breakpoint
ALTER TABLE "games" DROP CONSTRAINT "games_key_idx";--> statement-breakpoint
ALTER TABLE "storage_locations" DROP CONSTRAINT "storage_locations_org_name_idx";--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_heights" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_routes" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bins" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "module_configs" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sound_clips" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sound_rules" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "devices_org_hardware_idx" ON "devices" USING btree ("org_id","hardware_id") WHERE "devices"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "games_key_idx" ON "games" USING btree ("key") WHERE "games"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "storage_locations_org_name_idx" ON "storage_locations" USING btree ("org_id","name") WHERE "storage_locations"."is_deleted" = false;