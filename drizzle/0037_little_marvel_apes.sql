-- Switching the embedding model (SigLIP 768-dim -> CollectorVision Milo
-- 128-dim) makes every existing row's embedding incomparable to new ones,
-- and a straight ALTER ... SET DATA TYPE would fail outright against
-- existing 768-dim data (pgvector errors on a dimension mismatch). The old
-- data is fully superseded, not migratable, so this truncates the catalog
-- rather than trying to convert it - every game must be force-resynced
-- (see the admin sync panel's "Force full resync") after this migration
-- lands, before card matching works again.
TRUNCATE TABLE "cards";--> statement-breakpoint
-- Drop every per-game_key partial HNSW index (lib/game-vector-index.ts) -
-- they're built dynamically per configured game, so there's no static list
-- of names to enumerate here. ALTER COLUMN TYPE would otherwise fail with
-- them still attached, and CREATE INDEX CONCURRENTLY (how they're rebuilt)
-- can't run inside this migration's transaction anyway - rebuild each one
-- post-deploy via ensureGameVectorIndex (happens automatically the next
-- time each game is force-resynced).
DO $$
DECLARE idx RECORD;
BEGIN
  FOR idx IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'cards' AND indexname LIKE 'cards_embedding_hnsw_%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "embedding" SET DATA TYPE vector(128);--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "embedding_art";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "embedding_name";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "embedding_bottom";