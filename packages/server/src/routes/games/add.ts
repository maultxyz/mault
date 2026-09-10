import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { ensureGameVectorIndex } from "../../lib/game-vector-index";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { type GameInput, keyIsTaken, toGame } from "./shared";

export const addGameRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireRole("admin"),
  async (c) => {
    const { key, name, fieldDefinitions, apiDocsUrl, isActive } =
      await c.req.json<GameInput>();

    if (!key?.trim() || !name?.trim()) {
      return c.json(
        { success: false, message: "key and name are required." },
        400,
      );
    }

    const trimmedKey = key.trim();

    try {
      if (await keyIsTaken(trimmedKey)) {
        return c.json(
          {
            success: false,
            message: `A game with key "${trimmedKey}" already exists.`,
          },
          409,
        );
      }

      const [row] = await db
        .insert(games)
        .values({
          key: trimmedKey,
          name: name.trim(),
          fieldDefinitions,
          apiDocsUrl: apiDocsUrl?.trim() || null,
          isActive: isActive ?? true,
        })
        .returning();

      await ensureGameVectorIndex(row.key);
      return c.json({ success: true, data: toGame(row) });
    } catch (err) {
      // Backstop for a race between the check above and this insert (two
      // concurrent creates with the same key) - the DB's unique constraint is
      // still the actual guarantee, this is just a friendlier message for it.
      if (err instanceof Error && /unique/i.test(err.message)) {
        return c.json(
          {
            success: false,
            message: `A game with key "${trimmedKey}" already exists.`,
          },
          409,
        );
      }
      console.error(err);
      return c.json({ success: false, message: "Database error." }, 500);
    }
  },
);
