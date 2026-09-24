ALTER TABLE "devices" DROP CONSTRAINT "devices_org_idx";--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_org_hardware_idx" UNIQUE("org_id","hardware_id");