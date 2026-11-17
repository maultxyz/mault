CREATE TABLE "discord_user_links" (
	"user_id" text PRIMARY KEY NOT NULL,
	"discord_user_id" text,
	"discord_username" text,
	"link_code" text,
	"link_code_expires_at" timestamp,
	"linked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discord_user_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "discord_user_links_discord_user_idx" ON "discord_user_links" USING btree ("discord_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discord_user_links_code_idx" ON "discord_user_links" USING btree ("link_code");