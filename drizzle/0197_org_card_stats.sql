CREATE TABLE "org_card_stats" (
	"org_id" text NOT NULL,
	"variant" text NOT NULL,
	"payload" jsonb NOT NULL,
	"pricing_key" text NOT NULL,
	"day" text NOT NULL,
	"compute_started_at" timestamp with time zone NOT NULL,
	"invalidated_at" timestamp with time zone,
	"compute_duration_ms" integer NOT NULL,
	CONSTRAINT "org_card_stats_org_id_variant_pk" PRIMARY KEY("org_id","variant")
);
--> statement-breakpoint
ALTER TABLE "org_card_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_card_stats_dirty" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_card_stats_dirty" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "org_card_stats_dirty_org_idx" ON "org_card_stats_dirty" USING btree ("org_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION mark_org_card_stats_dirty_for(changed_org_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM pg_advisory_xact_lock_shared(hashtext('org_card_stats'), hashtext(changed_org_id));
  INSERT INTO org_card_stats_dirty (org_id)
  SELECT changed_org_id
  WHERE NOT EXISTS (SELECT 1 FROM org_card_stats_dirty d WHERE d.org_id = changed_org_id);
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION mark_collection_card_stats_dirty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  changed_collection_id integer;
  changed_collection_ids integer[];
  changed_org_id text;
  changed_org_ids text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT array_agg(DISTINCT collection_id ORDER BY collection_id), array_agg(DISTINCT org_id ORDER BY org_id)
    INTO changed_collection_ids, changed_org_ids FROM new_rows;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT array_agg(DISTINCT collection_id ORDER BY collection_id), array_agg(DISTINCT org_id ORDER BY org_id)
    INTO changed_collection_ids, changed_org_ids FROM old_rows;
  ELSE
    SELECT
      array_agg(DISTINCT changed.collection_id ORDER BY changed.collection_id) FILTER (WHERE diff.changes_collection_stats),
      array_agg(DISTINCT changed.org_id ORDER BY changed.org_id)
    INTO changed_collection_ids, changed_org_ids
    FROM old_rows o
    JOIN new_rows n ON n.id = o.id
    CROSS JOIN LATERAL (
      SELECT (o.collection_id, o.card_id, o.card_lang, o.card_name, o.card_set, o.card_set_name, o.card_rarity,
          o.card_color_identity, o.is_foil, o.foil_type, o.stamp, o.condition)
        IS DISTINCT FROM
        (n.collection_id, n.card_id, n.card_lang, n.card_name, n.card_set, n.card_set_name, n.card_rarity,
          n.card_color_identity, n.is_foil, n.foil_type, n.stamp, n.condition) AS changes_collection_stats
    ) diff
    CROSS JOIN LATERAL (VALUES (o.collection_id, o.org_id), (n.collection_id, n.org_id)) AS changed(collection_id, org_id)
    WHERE diff.changes_collection_stats
      OR (o.guid, o.org_id, o.scanned_at, o.created_at, o.low_confidence_match, o.has_alternative_matches,
          o.is_corrected, o.is_reviewed, o.intake_lot_id, o.acquisition_cost, o.acquisition_currency)
        IS DISTINCT FROM
        (n.guid, n.org_id, n.scanned_at, n.created_at, n.low_confidence_match, n.has_alternative_matches,
          n.is_corrected, n.is_reviewed, n.intake_lot_id, n.acquisition_cost, n.acquisition_currency);
  END IF;
  IF changed_collection_ids IS NOT NULL THEN
    FOREACH changed_collection_id IN ARRAY changed_collection_ids LOOP
      PERFORM pg_advisory_xact_lock_shared(hashtext('collection_card_stats'), changed_collection_id);
      INSERT INTO collection_card_stats_dirty (collection_id)
      SELECT changed_collection_id
      WHERE NOT EXISTS (
        SELECT 1 FROM collection_card_stats_dirty d WHERE d.collection_id = changed_collection_id
      );
    END LOOP;
  END IF;
  IF changed_org_ids IS NOT NULL THEN
    FOREACH changed_org_id IN ARRAY changed_org_ids LOOP
      PERFORM mark_org_card_stats_dirty_for(changed_org_id);
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION mark_org_card_stats_dirty() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM mark_org_card_stats_dirty_for(OLD.org_id);
  ELSE
    PERFORM mark_org_card_stats_dirty_for(NEW.org_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER collections_org_card_stats_dirty AFTER INSERT OR DELETE OR UPDATE OF "name", "is_deleted", "game_id", "lang", "org_id" ON "collections"
FOR EACH ROW EXECUTE FUNCTION mark_org_card_stats_dirty();--> statement-breakpoint
CREATE TRIGGER intake_lots_org_card_stats_dirty AFTER INSERT OR DELETE OR UPDATE OF "status", "org_id" ON "intake_lots"
FOR EACH ROW EXECUTE FUNCTION mark_org_card_stats_dirty();
