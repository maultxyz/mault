ALTER TABLE "feeder_config_audit" ADD COLUMN "reverse_speed" integer DEFAULT 333 NOT NULL;--> statement-breakpoint
ALTER TABLE "feeder_config_audit" ADD COLUMN "reverse_duration" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feeder_configs" ADD COLUMN "reverse_speed" integer DEFAULT 333 NOT NULL;--> statement-breakpoint
ALTER TABLE "feeder_configs" ADD COLUMN "reverse_duration" integer DEFAULT 0 NOT NULL;