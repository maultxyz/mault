import type { HealthCheck, HealthCheckResponse } from "@magic-vault/shared";
import { count, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import pkg from "../../package.json";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { fetchCardApi } from "../lib/card-search/fetch";
import { FAB_DEFAULT_URL } from "../lib/fab/search";
import { GUNDAM_DEFAULT_URL } from "../lib/gundam/search";
import { LORCANA_DEFAULT_URL } from "../lib/lorcana/search";
import { ONE_PIECE_DEFAULT_URL } from "../lib/onepiece/search";
import { POKEMON_DEFAULT_URL } from "../lib/pokemon/search";
import { SCRYFALL_DEFAULT_URL } from "../lib/scryfall/search";
import { YUGIOH_DEFAULT_URL } from "../lib/yugioh/search";
import type { AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

// GET /public/version — unauthenticated, polled by the web client to prompt a refresh on deploy.
router.get("/version", (c) => {
  return c.json({ success: true, data: { version: pkg.version } });
});

// GET /public/games — unauthenticated, for the marketing/landing page.
router.get("/games", async (c) => {
  try {
    const rows = await db
      .select({ key: games.key, name: games.name })
      .from(games)
      .where(eq(games.isActive, true))
      .orderBy(games.name);

    const countRows = await db
      .select({ gameKey: cardImageVectors.gameKey, count: count() })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));

    const langRows = await db
      .select({
        gameKey: cardImageVectors.gameKey,
        lang: cardImageVectors.lang,
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey, cardImageVectors.lang);
    const langsByKey = new Map<string, string[]>();
    for (const row of langRows) {
      const list = langsByKey.get(row.gameKey) ?? [];
      list.push(row.lang);
      langsByKey.set(row.gameKey, list);
    }

    const data = rows.map((row) => ({
      ...row,
      cardCount: countByKey.get(row.key) ?? 0,
      languages: (langsByKey.get(row.key) ?? []).sort(),
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

const EXTERNAL_API_CHECKS: { name: string; url: string; gameKey: string }[] = [
  {
    name: "Scryfall (Magic: The Gathering)",
    url: SCRYFALL_DEFAULT_URL,
    gameKey: "mtg",
  },
  { name: "TCGdex (Pokémon)", url: POKEMON_DEFAULT_URL, gameKey: "pokemon" },
  { name: "Gundam Card Game API", url: GUNDAM_DEFAULT_URL, gameKey: "gundam" },
  {
    name: "Lorcast (Disney Lorcana)",
    url: LORCANA_DEFAULT_URL,
    gameKey: "lorcana",
  },
  {
    name: "OPTCGAPI (One Piece)",
    url: ONE_PIECE_DEFAULT_URL,
    gameKey: "onepiece",
  },
  { name: "Flesh and Blood API", url: FAB_DEFAULT_URL, gameKey: "fab" },
  {
    name: "YGOPRODeck (Yu-Gi-Oh!)",
    url: YUGIOH_DEFAULT_URL,
    gameKey: "yugioh",
  },
];

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await db.execute(sql`select 1`);
    return { name: "Database", status: "ok", latencyMs: Date.now() - start };
  } catch {
    return {
      name: "Database",
      status: "error",
      latencyMs: Date.now() - start,
      message: "Connection failed.",
    };
  }
}

async function checkExternalApi(
  name: string,
  url: string,
  gameKey: string,
): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetchCardApi(url, { method: "GET" });
    await response.body?.cancel();
    return { name, status: "ok", latencyMs: Date.now() - start, gameKey };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      name,
      status: "error",
      latencyMs: Date.now() - start,
      message: timedOut ? "Timed out." : "Unreachable.",
      gameKey,
    };
  }
}

const HEALTH_CACHE_TTL_MS = 20_000;
let cachedHealth: { data: HealthCheckResponse; expiresAt: number } | null =
  null;

// GET /public/health — unauthenticated. Polled by the app footer and the
// dedicated health page to surface upstream card-API/DB outages instead of
// letting them show up only as a failed search with no context.
router.get("/health", async (c) => {
  if (cachedHealth && cachedHealth.expiresAt > Date.now()) {
    return c.json({ success: true, data: cachedHealth.data });
  }

  const [database, ...externalApis] = await Promise.all([
    checkDatabase(),
    ...EXTERNAL_API_CHECKS.map((api) =>
      checkExternalApi(api.name, api.url, api.gameKey),
    ),
  ]);
  const checks = [database, ...externalApis];

  const data: HealthCheckResponse = {
    healthy: checks.every((check) => check.status === "ok"),
    checkedAt: new Date().toISOString(),
    checks,
  };
  cachedHealth = { data, expiresAt: Date.now() + HEALTH_CACHE_TTL_MS };
  return c.json({ success: true, data });
});

export { router as publicRouter };
