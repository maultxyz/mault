ALTER TABLE "trade_offers" ADD COLUMN "guest_user_id" text;--> statement-breakpoint
CREATE INDEX "trade_offers_guest_user_idx" ON "trade_offers" USING btree ("guest_user_id","created_at");