ALTER TABLE "bin_routes" DROP CONSTRAINT "bin_routes_org_bin_idx";--> statement-breakpoint
ALTER TABLE "feeder_configs" DROP CONSTRAINT "feeder_configs_org_idx";--> statement-breakpoint
ALTER TABLE "module_configs" DROP CONSTRAINT "module_configs_org_module_idx";--> statement-breakpoint
ALTER TABLE "bin_route_audit" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bin_routes" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "feeder_config_audit" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "feeder_configs" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "module_config_audit" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "module_configs" ALTER COLUMN "device_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "scan_coverage";--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "scan_offset_x";--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "scan_offset_y";--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "capture_settle_delay_ms";--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "module_count";--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "channel_layout";--> statement-breakpoint
ALTER TABLE "bin_routes" ADD CONSTRAINT "bin_routes_device_bin_idx" UNIQUE("device_id","bin_number");--> statement-breakpoint
ALTER TABLE "feeder_configs" ADD CONSTRAINT "feeder_configs_device_idx" UNIQUE("device_id");--> statement-breakpoint
ALTER TABLE "module_configs" ADD CONSTRAINT "module_configs_device_module_idx" UNIQUE("device_id","module_number");