UPDATE "collection_cards" SET "needs_review" = false WHERE "needs_review" = true AND ("is_corrected" = true OR "is_reviewed" = true);
