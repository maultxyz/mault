CREATE INDEX "bins_org_bin_number_live_idx" ON "bins" USING btree ("org_id","bin_number") WHERE "bins"."is_deleted" = false;--> statement-breakpoint
CREATE INDEX "collection_cards_org_id_idx" ON "collection_cards" USING btree ("org_id","id");--> statement-breakpoint
CREATE INDEX "collection_cards_card_name_trgm_idx" ON "collection_cards" USING gin (lower("card_name") gin_trgm_ops);