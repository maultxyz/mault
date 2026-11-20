CREATE TABLE "collection_card_stats" (
	"collection_id" integer PRIMARY KEY NOT NULL,
	"stats" jsonb NOT NULL,
	"pricing_key" text NOT NULL,
	"compute_started_at" timestamp with time zone NOT NULL,
	"compute_duration_ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_card_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collection_card_stats_dirty" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" integer NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_card_stats_dirty" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_card_stats" ADD CONSTRAINT "collection_card_stats_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_card_stats_dirty_collection_idx" ON "collection_card_stats_dirty" USING btree ("collection_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION mark_collection_card_stats_dirty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  changed_collection_id integer;
  changed_collection_ids integer[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT collection_id ORDER BY collection_id) INTO changed_collection_ids FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT collection_id ORDER BY collection_id) INTO changed_collection_ids FROM old_rows;
  ELSE
    SELECT array_agg(DISTINCT changed.collection_id ORDER BY changed.collection_id) INTO changed_collection_ids
    FROM old_rows o
    JOIN new_rows n ON n.id = o.id
    CROSS JOIN LATERAL (VALUES (o.collection_id), (n.collection_id)) AS changed(collection_id)
    WHERE (o.collection_id, o.card_id, o.card_lang, o.card_name, o.card_set, o.card_set_name, o.card_rarity,
        o.card_color_identity, o.is_foil, o.foil_type, o.stamp, o.condition)
      IS DISTINCT FROM
      (n.collection_id, n.card_id, n.card_lang, n.card_name, n.card_set, n.card_set_name, n.card_rarity,
        n.card_color_identity, n.is_foil, n.foil_type, n.stamp, n.condition);
  END IF;
  IF changed_collection_ids IS NULL THEN
    RETURN NULL;
  END IF;
  FOREACH changed_collection_id IN ARRAY changed_collection_ids LOOP
    PERFORM pg_advisory_xact_lock_shared(hashtext('collection_card_stats'), changed_collection_id);
    INSERT INTO collection_card_stats_dirty (collection_id)
    SELECT changed_collection_id
    WHERE NOT EXISTS (
      SELECT 1 FROM collection_card_stats_dirty d WHERE d.collection_id = changed_collection_id
    );
  END LOOP;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER collection_cards_stats_dirty_insert AFTER INSERT ON "collection_cards"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_collection_card_stats_dirty();--> statement-breakpoint
CREATE TRIGGER collection_cards_stats_dirty_update AFTER UPDATE ON "collection_cards"
REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_collection_card_stats_dirty();--> statement-breakpoint
CREATE TRIGGER collection_cards_stats_dirty_delete AFTER DELETE ON "collection_cards"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION mark_collection_card_stats_dirty();
