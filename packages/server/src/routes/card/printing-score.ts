import {
  DISTANCE_THRESHOLD,
  PRINTING_SCORE_CARD_ID_MAX_LENGTH,
  type PlayingCardImage,
  type PrintingScoreHit,
  type PrintingScoreResult,
  type PrintingScoreVerdict,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { authQuery } from "../../db";
import { MILO_EMBEDDING_DIM } from "../../lib/constants/card-search";
import {
  resolveCardSearchForGame,
  resolveGameKeyAndLang,
} from "../../lib/card-search/resolve";
import type {
  CardMatchSearchResult,
  CollectionMatchScope,
  OrientedCardMatch,
} from "../../lib/interfaces/card-search";
import { vectorizeCardImage } from "../../lib/vectorize";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import {
  cardDistanceSql,
  findCardMatches,
  langFilter,
  parseEmbeddingField,
  vectorLiteral,
} from "./shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

function validEmbedding(value: number[] | null): number[] | null {
  if (!value || value.length !== MILO_EMBEDDING_DIM) return null;
  return value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ? value
    : null;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
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

function hasMatch(result: CardMatchSearchResult): boolean {
  return (result.data?.length ?? 0) > 0;
}

function pickOrientation(matches: OrientedCardMatch[]): OrientedCardMatch {
  return matches.reduce((best, next) => {
    if (hasMatch(best.result) !== hasMatch(next.result)) {
      return hasMatch(next.result) ? next : best;
    }
    const bestDistance = best.result.nearestDistance ?? Number.POSITIVE_INFINITY;
    const nextDistance = next.result.nearestDistance ?? Number.POSITIVE_INFINITY;
    return nextDistance < bestDistance ? next : best;
  });
}

function verdictFor(
  result: CardMatchSearchResult,
  cardId: string,
): PrintingScoreVerdict {
  const top = result.data?.[0];
  if (top) return top.cardId === cardId ? "accept" : "other_card";
  return result.diagnostics?.reason ?? "too_far";
}

function nearestCardId(result: CardMatchSearchResult): string | null {
  return (
    result.data?.[0]?.cardId ??
    result.diagnostics?.candidates[0]?.cardId ??
    null
  );
}

async function loadHits(
  jwtClaims: string,
  scope: CollectionMatchScope,
  embedding: number[],
  cardIds: string[],
): Promise<Map<string, PrintingScoreHit>> {
  const embeddingStr = vectorLiteral(embedding)!;
  const result = await authQuery(jwtClaims, (tx) =>
    tx.execute(sql`
      SELECT DISTINCT ON (card_id)
        card_id,
        lang,
        name,
        set_code,
        collector_number,
        data,
        ${cardDistanceSql(embeddingStr)} AS distance
      FROM cards
      WHERE game_key = ${scope.gameKey} ${langFilter(scope)}
        AND card_id IN (${sql.join(
          cardIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      ORDER BY card_id, distance
    `),
  );
  const hits = new Map<string, PrintingScoreHit>();
  for (const row of result.rows) {
    const hit = toHit(row, scope.gameKey);
    if (hit) hits.set(hit.id, hit);
  }
  return hits;
}

async function embeddingFromUpload(value: unknown): Promise<number[] | null> {
  if (!(value instanceof File) || !value.type.startsWith("image/")) return null;
  const vector = await vectorizeCardImage(Buffer.from(await value.arrayBuffer()));
  return validEmbedding(vector.embedding);
}

async function embeddingsFromImages(uploads: unknown[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const upload of uploads) {
    const embedding = await embeddingFromUpload(upload);
    if (embedding) embeddings.push(embedding);
  }
  return embeddings;
}

export const printingScoreRoute = new Hono<AppEnv>().post(
  "/printing-score",
  requireAuth,
  requireOrg,
  async (c) => {
    const body = await c.req.parseBody();
    const cardId = typeof body["cardId"] === "string" ? body["cardId"].trim() : "";
    if (!cardId || cardId.length > PRINTING_SCORE_CARD_ID_MAX_LENGTH) {
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
      .map((value) => validEmbedding(parseEmbeddingField(value)))
      .filter((value): value is number[] => value != null);

    if (embeddings.length === 0) {
      try {
        embeddings = await embeddingsFromImages([body["image"], body["rotatedImage"]]);
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
      const matches: OrientedCardMatch[] = [];
      for (const embedding of embeddings) {
        matches.push({
          embedding,
          result: await findCardMatches(c.get("jwtClaims"), {
            ...resolved,
            embeddings: { embedding },
          }),
        });
      }
      const picked = pickOrientation(matches);
      const nearestId = nearestCardId(picked.result);
      const hits = await loadHits(
        c.get("jwtClaims"),
        resolved,
        picked.embedding,
        nearestId && nearestId !== cardId ? [cardId, nearestId] : [cardId],
      );
      const card = hits.get(cardId) ?? null;
      const response: PrintingScoreResult = {
        success: true,
        found: card != null,
        distanceThreshold: DISTANCE_THRESHOLD,
        verdict: verdictFor(picked.result, cardId),
        card,
        nearest: nearestId ? (hits.get(nearestId) ?? null) : null,
      };
      return c.json(response);
    } catch (err) {
      return databaseErrorResponse(c, err);
    }
  },
);
