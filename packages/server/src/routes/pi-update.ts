import { Hono } from "hono";
import { isPiHost } from "../lib/pi-host";
import { getPiUpdateStatus, startPiUpdate } from "../lib/pi-update";
import { requireAuth, requireRole, type AppEnv } from "../middleware/auth";

export const piUpdateRouter = new Hono<AppEnv>()
  .use("*", async (c, next) => (isPiHost() ? next() : c.notFound()))
  .use("*", requireAuth, requireRole("admin"))
  .get("/", async (c) => {
    try {
      return c.json({ success: true, data: await getPiUpdateStatus() });
    } catch {
      return c.json(
        { success: false, message: "Could not check for Linux updates." },
        503,
      );
    }
  })
  .post("/", async (c) => {
    try {
      return c.json({ success: true, data: await startPiUpdate() }, 202);
    } catch (error) {
      return c.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Could not start the update.",
        },
        409,
      );
    }
  });
