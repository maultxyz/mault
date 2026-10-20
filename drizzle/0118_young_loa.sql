CREATE TABLE "platform_discord_channels" (
	"key" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"channel_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "platform_discord_channels" ("key", "guild_id", "channel_id")
SELECT 'stats', "guild_id", "channel_id" FROM "platform_stats_settings" WHERE "id" = 'platform';--> statement-breakpoint
ALTER TABLE "platform_stats_settings" DROP COLUMN "guild_id";--> statement-breakpoint
ALTER TABLE "platform_stats_settings" DROP COLUMN "channel_id";