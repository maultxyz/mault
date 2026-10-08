ALTER TABLE "cards" ADD COLUMN "collector_number" text;--> statement-breakpoint
CREATE INDEX "cards_collector_number_idx" ON "cards" USING btree ("game_key","lang",lower("collector_number"));