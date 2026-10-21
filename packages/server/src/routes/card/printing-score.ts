import {
  DISTANCE_THRESHOLD,
  type PlayingCardImage,
  type PrintingScoreHit,
  type PrintingScoreResult,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { sql, type SQL } from "drizzle-orm";
import { authQuery } from "../../db";
import {
  CARD_MATCH_HNSW_EF_SEARCH,
  MILO_EMBEDDING_DIM,
} from "../../lib/constants/card-search";
import {
  resolveCardSearchForGame,
  resolveGameKeyAndLang,
} from "../../lib/card-search/resolve";
import type { CollectionMatchScope } from "../../lib/interfaces/card-search";
import { vectorizeCardImage } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { parseEmbeddingField } from "./shared";

function embeddingLiteral(value: number[] | null): string | null {
  if (!value || value.length !== MILO_EMBEDDING_DIM) return null;
  if (!value.every((entry) => typeof entry === "number" && Number.isFinite(entry))) {
    return null;
  }
  return `[${value.join(",")}]`;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function langSql(scope: CollectionMatchScope): SQL {
  return scope.matchAllLanguages ? sql`` : sql`AND lang = ${scope.lang}`;
}

function distanceSql(embeddingStr: string): SQL {
  return sql`CASE
    WHEN back_embedding IS NULL THEN embedding <=> ${embeddingStr}::vector(128)
    ELSE LEAST(
      embedding <=> ${embeddingStr}::vector(128),
      back_embedding <=> ${embeddingStr}::vector(128)
    )
  END`;
}

function imageFor(
  gameKey: string,
  lang: string,
  cardId: string,
  data: unknown,
): PlayingCardImage | null {
  const resolved = resolveCardSearchForGame(gameKey, lang);
  return resolved?.adapter.normalizeStored(data, cardId, lang)?.image ?? null;
}

function toHit(
  row: Record<string, unknown> | undefined,
  gameKey: string,
): PrintingScoreHit | null {
  if (!row || typeof row.card_id !== "string" || typeof row.name !== "string") {
    return null;
  }
  const distance = asNumber(row.distance);
  if (distance == null) return null;
  const lang = typeof row.lang === "string" ? row.lang : "en";
  return {
    id: row.card_id,
    name: row.name,
    set: typeof row.set_code === "string" ? row.set_code : "",
    collectorNumber:
      typeof row.collector_number === "string" ? row.collector_number : "",
    image: imageFor(gameKey, lang, row.card_id, row.data),
    distance,
  };
}

async function scoreEmbedding(
  jwtClaims: string,
  scope: CollectionMatchScope,
  embeddingStr: string,
  cardId: string,
): Promise<PrintingScoreResult> {
  const { gameKey } = scope;
  return authQuery(jwtClaims, async (tx) => {
    await tx.execute(sql`
      SELECT
        set_config('hnsw.iterative_scan', 'strict_order', true),
        set_config('hnsw.max_scan_tuples', '100000', true),
        set_config('hnsw.ef_search', ${String(CARD_MATCH_HNSW_EF_SEARCH)}, true)
    `);

    const printing = await tx.execute(sql`
      SELECT
        card_id,
        lang,
        name,
        set_code,
        collector_number,
        data,
        ${distanceSql(embeddingStr)} AS distance
      FROM cards
      WHERE game_key = ${gameKey} ${langSql(scope)}
        AND card_id = ${cardId}
      ORDER BY distance
      LIMIT 1
    `);

    const nearest = await tx.execute(sql`
      SELECT card_id, lang, name, set_code, collector_number, data, distance
      FROM (
        (
          SELECT
            card_id,
            lang,
            name,
            set_code,
            collector_number,
            data,
            embedding <=> ${embeddingStr}::vector(128) AS distance
          FROM cards
          WHERE game_key = ${gameKey} ${langSql(scope)}
          ORDER BY embedding <=> ${embeddingStr}::vector(128)
          LIMIT 1
        )
        UNION ALL
        (
          SELECT
            card_id,
            lang,
            name,
            set_code,
            collector_number,
            data,
            back_embedding <=> ${embeddingStr}::vector(128) AS distance
          FROM cards
          WHERE back_embedding IS NOT NULL
            AND game_key = ${gameKey} ${langSql(scope)}
          ORDER BY back_embedding <=> ${embeddingStr}::vector(128)
          LIMIT 1
        )
      ) faces
      ORDER BY distance
      LIMIT 1
    `);

    const card = toHit(printing.rows[0], gameKey);
    return {
      success: true,
      found: card != null,
      distanceThreshold: DISTANCE_THRESHOLD,
      card,
      nearest: toHit(nearest.rows[0], gameKey),
    };
  });
}

function preferScore(
  scores: PrintingScoreResult[],
): PrintingScoreResult {
  return scores.reduce((best, next) => {
    const bestDistance = best.card?.distance ?? Number.POSITIVE_INFINITY;
    const nextDistance = next.card?.distance ?? Number.POSITIVE_INFINITY;
    if (next.found && nextDistance < bestDistance) return next;
    if (!best.found && !next.found) {
      const bestNearest = best.nearest?.distance ?? Number.POSITIVE_INFINITY;
      const nextNearest = next.nearest?.distance ?? Number.POSITIVE_INFINITY;
      return nextNearest < bestNearest ? next : best;
    }
    return best;
  });
}

async function literalFromUpload(value: unknown): Promise<string | null> {
  if (!value || typeof value === "string") return null;
  if (typeof value !== "object" || !("type" in value) || !("arrayBuffer" in value)) {
    return null;
  }
  const file = value as { type: unknown; arrayBuffer: () => Promise<ArrayBuffer> };
  if (typeof file.type !== "string" || !file.type.startsWith("image/")) return null;
  const vector = await vectorizeCardImage(Buffer.from(await file.arrayBuffer()));
  return embeddingLiteral(vector.embedding);
}

async function literalsFromImages(
  uploads: unknown[],
): Promise<string[]> {
  const literals: string[] = [];
  for (const upload of uploads) {
    const literal = await literalFromUpload(upload);
    if (literal) literals.push(literal);
  }
  return literals;
}

export const printingScoreRoute = new Hono<AppEnv>().post(
  "/printing-score",
  requireAuth,
  requireOrg,
  async (c) => {
    const body = await c.req.parseBody();
    const cardId = typeof body["cardId"] === "string" ? body["cardId"].trim() : "";
    if (!cardId || cardId.length > 1024) {
      return c.json({ success: false, message: "A card is required." }, 400);
    }

    const collectionGuid =
      typeof body["collectionGuid"] === "string" ? body["collectionGuid"] : undefined;
    const resolved = await resolveGameKeyAndLang(c.get("jwtClaims"), collectionGuid);
    if (!resolved) {
      return c.json(
        { success: false, message: "No game configured for this collection." },
        400,
      );
    }

    let embeddings = [body["embedding"], body["rotatedEmbedding"]]
      .map((value) => embeddingLiteral(parseEmbeddingField(value)))
      .filter((value): value is string => value != null);

    if (embeddings.length === 0) {
      try {
        embeddings = await literalsFromImages([body["image"], body["rotatedImage"]]);
      } catch (err) {
        console.error(err);
        return c.json(
          { success: false, message: "Failed to vectorize image." },
          500,
        );
      }
    }

    if (embeddings.length === 0) {
      return c.json({ success: false, message: "No embedding provided." }, 400);
    }

    try {
      const scores: PrintingScoreResult[] = [];
      for (const embedding of embeddings) {
        scores.push(
          await scoreEmbedding(
            c.get("jwtClaims"),
            resolved,
            embedding,
            cardId,
          ),
        );
      }
      return c.json(preferScore(scores));
    } catch (err) {
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
