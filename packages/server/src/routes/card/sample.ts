import { Hono } from "hono";
import { resolveCardSearchForGame } from "../../lib/card-search/resolve";
import { sampleStoredCard } from "../../lib/card-search/stored-cards";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";

export const sampleCardRoute = new Hono<AppEnv>().get(
  "/sample",
  requireAuth,
  requireOrg,
  async (c) => {
    const resolved = resolveCardSearchForGame(
      c.req.query("gameKey") ?? "",
      c.req.query("lang") || "en",
    );
    if (!resolved) {
      return c.json({ success: false, message: "Unknown game." }, 400);
    }
    const index = Number.parseInt(c.req.query("index") ?? "0", 10);
    const card = await sampleStoredCard(
      resolved,
      Number.isFinite(index) && index > 0 ? index : 0,
    );
    return c.json({
      success: true,
      message: card ? "Sample card loaded." : "No stored cards.",
      data: card,
    });
  },
);
