import { PLATFORM_STAFF_ROLES } from "@magic-vault/shared";
import { Hono } from "hono";
import { db } from "../../db";
import { games } from "../../db/schema";
import { ensureGameVectorIndex } from "../../lib/game-vector-index";
import { publicGamesCache } from "../../lib/public-games";
import { requireAuth, requireRole, type AppEnv } from "../../middleware/auth";
import { keyIsTaken, toGame } from "./shared";
import type { GameInput } from "@magic-vault/shared";
import { databaseErrorResponse } from "../../lib/database-error-response";

export const addGameRoute = new Hono<AppEnv>().post(
  "/",
  requireAuth,
  requireRole(...PLATFORM_STAFF_ROLES),
  async (c) => {
    const {
      key,
      name,
      fieldDefinitions,
      foilTypes,
      apiDocsUrl,
      cardThickness,
      isActive,
    } = await c.req.json<GameInput>();

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
          foilTypes: foilTypes ?? [],
          apiDocsUrl: apiDocsUrl?.trim() || null,
          cardThickness: cardThickness ?? null,
          isActive: isActive ?? true,
        })
        .returning();

      void ensureGameVectorIndex(row.key);
      publicGamesCache.invalidate();
      return c.json({ success: true, data: toGame(row) });
    } catch (err) {
      if (err instanceof Error && /unique/i.test(err.message)) {
        return c.json(
          {
            success: false,
            message: `A game with key "${trimmedKey}" already exists.`,
          },
          409,
        );
      }
      return databaseErrorResponse(c, err);
    }
  },
);
