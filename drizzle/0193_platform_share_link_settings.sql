CREATE TABLE "platform_share_link_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"trade_link_hours" integer NOT NULL,
	"restricted_share_link_hours" integer NOT NULL,
	"monitor_link_expiry_days" integer[] NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
