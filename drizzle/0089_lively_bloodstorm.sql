CREATE TABLE "platform_stats_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"channel_id" text,
	"stats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
