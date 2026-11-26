import {
  deckLinkImportRequestSchema,
  parseDeckLinkUrl,
  type DeckLinkImportResult,
} from "@magic-vault/shared";
import { Hono } from "hono";
import { fetchDeckLinkImport } from "../../lib/deck-links";
import {
  markRequestAsReadOnly,
  requireAuth,
  requireOrg,
  type AppEnv,
} from "../../middleware/auth";

export const deckLinkImportRoute = new Hono<AppEnv>().post(
  "/deck-link",
  requireAuth,
  requireOrg,
  markRequestAsReadOnly,
  async (c) => {
    const parsed = deckLinkImportRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    const reference = parsed.success ? parseDeckLinkUrl(parsed.data.url) : null;
    if (!reference) {
      return c.json<DeckLinkImportResult>(
        { success: false, message: "Unsupported deck link." },
        400,
      );
    }
    const result = await fetchDeckLinkImport(reference);
    if (!result.deck) {
      return c.json<DeckLinkImportResult>({
        success: false,
        message: "Couldn't load that deck.",
        failure: result.failure,
      });
    }
    return c.json<DeckLinkImportResult>({
      success: true,
      message: "Deck loaded.",
      data: result.deck,
    });
  },
);
