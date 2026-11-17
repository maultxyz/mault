CREATE TABLE "platform_discord_roles" (
	"key" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"role_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
