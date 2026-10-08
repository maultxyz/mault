CREATE INDEX "bin_sets_org_game_idx" ON "bin_sets" USING btree ("org_id","game_id");--> statement-breakpoint
CREATE INDEX "bins_bin_set_number_idx" ON "bins" USING btree ("bin_set","bin_number");--> statement-breakpoint
CREATE INDEX "collection_cards_collection_bin_scanned_idx" ON "collection_cards" USING btree ("collection_id","bin_number","scanned_at");--> statement-breakpoint
CREATE INDEX "collections_org_idx" ON "collections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "unmatched_cards_collection_scanned_idx" ON "unmatched_cards" USING btree ("collection_id","scanned_at");