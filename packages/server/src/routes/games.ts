import type { FieldMeta, Game, GameCoverage } from "@magic-vault/shared";
import { count, eq, max } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { cardImageVectors, games } from "../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "../lib/card-search/resolve";
import { ensureGameVectorIndex } from "../lib/game-vector-index";
import { requireAuth, requireRole, type AppEnv } from "../middleware/auth";

const router = new Hono<AppEnv>();

function toGame(row: typeof games.$inferSelect): Game {
  return {
    guid: row.guid!,
    key: row.key,
    name: row.name,
    isActive: row.isActive,
    fieldDefinitions: row.fieldDefinitions as FieldMeta[],
    apiDocsUrl: row.apiDocsUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface GameInput {
  key: string;
  name: string;
  fieldDefinitions: FieldMeta[];
  apiDocsUrl?: string | null;
  isActive?: boolean;
}

// GET /games — any authenticated user (needed to pick a game per collection)
router.get("/", requireAuth, async (c) => {
  try {
    const rows = await db.select().from(games).orderBy(games.name);
    return c.json({ success: true, data: rows.map(toGame) });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.get("/coverage", requireAuth, async (c) => {
  try {
    const gameRows = await db.select().from(games).orderBy(games.name);

    const countRows = await db
      .select({
        gameKey: cardImageVectors.gameKey,
        count: count(),
        lastUpdated: max(cardImageVectors.updatedAt),
      })
      .from(cardImageVectors)
      .groupBy(cardImageVectors.gameKey);
    const countByKey = new Map(countRows.map((r) => [r.gameKey, r.count]));
    const lastUpdatedByKey = new Map(
      countRows.map((r) => [r.gameKey, r.lastUpdated]),
    );

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

    const data: GameCoverage[] = gameRows.map((row) => ({
      guid: row.guid!,
      key: row.key,
      name: row.name,
      isActive: row.isActive,
      cardCount: countByKey.get(row.key) ?? 0,
      languages: (langsByKey.get(row.key) ?? []).sort(),
      lastUpdated: lastUpdatedByKey.get(row.key)?.toISOString() ?? null,
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

// GET /games/sample-card?key=pokemon&query=pikachu — searches the game's
// adapter for a real card so the field-mapping UI can offer real paths
// instead of asking admins to type them blind. Keyed by `key`, not `guid`,
// so it works while creating a new game too (before it has a row/guid).
router.get("/sample-card", requireAuth, requireRole("admin"), async (c) => {
  const key = c.req.query("key");
  const query = c.req.query("query");
  if (!key) {
    return c.json({ success: false, message: "key is required." }, 400);
  }
  if (!query?.trim()) {
    return c.json({ success: false, message: "query is required." }, 400);
  }

  const adapter = ADAPTERS_BY_GAME_KEY[key];
  if (!adapter) {
    return c.json(
      { success: false, message: `No card source for game key: ${key}` },
      400,
    );
  }

  try {
    const result = await adapter.search(query, adapter.defaultUrl, "en");
    if (!result.success || !result.data?.length) {
      return c.json(
        { success: false, message: result.message || "No cards found." },
        404,
      );
    }

    const card = result.data[0];
    return c.json({
      success: true,
      data: { name: card.name, raw: card.raw },
    });
  } catch (err) {
    console.error(err);
    return c.json(
      { success: false, message: "Failed to fetch sample card." },
      502,
    );
  }
});

router.get("/:guid/languages", requireAuth, async (c) => {
  const guid = c.req.param("guid");
  try {
    const game = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { key: true },
    });
    if (!game)
      return c.json({ success: false, message: "Game not found." }, 404);

    const rows = await db
      .select({ lang: cardImageVectors.lang })
      .from(cardImageVectors)
      .where(eq(cardImageVectors.gameKey, game.key))
      .groupBy(cardImageVectors.lang)
      .orderBy(cardImageVectors.lang);

    return c.json({ success: true, data: rows?.map((r) => r.lang) ?? [] });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.post("/", requireAuth, requireRole("admin"), async (c) => {
  const { key, name, fieldDefinitions, apiDocsUrl, isActive } =
    await c.req.json<GameInput>();

  if (!key?.trim() || !name?.trim()) {
    return c.json(
      { success: false, message: "key and name are required." },
      400,
    );
  }

  try {
    const [row] = await db
      .insert(games)
      .values({
        key: key.trim(),
        name: name.trim(),
        fieldDefinitions,
        apiDocsUrl: apiDocsUrl?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning();
    // Cheap here since a brand-new game has no cards yet — the partial
    // index just needs to exist before the sync job starts inserting rows.
    await ensureGameVectorIndex(row.key);
    return c.json({ success: true, data: toGame(row) });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return c.json(
        { success: false, message: `A game with key "${key}" already exists.` },
        409,
      );
    }
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.put("/:guid", requireAuth, requireRole("admin"), async (c) => {
  const guid = c.req.param("guid");
  const { key, name, fieldDefinitions, apiDocsUrl, isActive } =
    await c.req.json<Partial<GameInput>>();

  try {
    const target = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { id: true, key: true },
    });
    if (!target)
      return c.json({ success: false, message: "Game not found." }, 404);

    const updates: Partial<typeof games.$inferInsert> = {
      updatedAt: new Date(),
    };
    const newKey = key !== undefined ? key.trim() : undefined;
    if (newKey !== undefined) updates.key = newKey;
    if (name !== undefined) updates.name = name.trim();
    if (fieldDefinitions !== undefined)
      updates.fieldDefinitions = fieldDefinitions;
    if (apiDocsUrl !== undefined) updates.apiDocsUrl = apiDocsUrl?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;

    const [row] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, target.id))
      .returning();
    if (newKey !== undefined && newKey !== target.key) {
      await ensureGameVectorIndex(newKey);
    }
    return c.json({ success: true, data: toGame(row) });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return c.json(
        { success: false, message: `A game with key "${key}" already exists.` },
        409,
      );
    }
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

router.delete("/:guid", requireAuth, requireRole("admin"), async (c) => {
  const guid = c.req.param("guid");
  try {
    const target = await db.query.games.findFirst({
      where: (t, { eq }) => eq(t.guid, guid),
      columns: { id: true },
    });
    if (!target)
      return c.json({ success: false, message: "Game not found." }, 404);

    await db.delete(games).where(eq(games.id, target.id));
    return c.json({ success: true, data: null });
  } catch (err) {
    console.error(err);
    return c.json({ success: false, message: "Database error." }, 500);
  }
});

export { router as gamesRouter };
