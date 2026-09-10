import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { ensureGameVectorIndex } from "../../lib/game-vector-index";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { type GameInput, keyIsTaken, toGame } from "./shared";

export const editGameRoute = new Hono<AppEnv>().put(
  "/:guid",
  requireAuth,
  requireRole("admin"),
  async (c) => {
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
      if (newKey !== undefined && newKey !== target.key) {
        if (await keyIsTaken(newKey, guid)) {
          return c.json(
            {
              success: false,
              message: `A game with key "${newKey}" already exists.`,
            },
            409,
          );
        }
      }
      if (newKey !== undefined) updates.key = newKey;
      if (name !== undefined) updates.name = name.trim();
      if (fieldDefinitions !== undefined)
        updates.fieldDefinitions = fieldDefinitions;
      if (apiDocsUrl !== undefined)
        updates.apiDocsUrl = apiDocsUrl?.trim() || null;
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
      // Backstop for a race between the check above and this update.
      if (err instanceof Error && /unique/i.test(err.message)) {
        return c.json(
          { success: false, message: `A game with key "${key}" already exists.` },
          409,
        );
      }
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
