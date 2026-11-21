CREATE TABLE "leaderboard_snapshots" (
	"variant" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"payload" jsonb NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"compute_duration_ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ENABLE ROW LEVEL SECURITY;