import type { Context } from "hono";
import { rollbar } from "./rollbar";

export function databaseErrorResponse(c: Context, err: unknown) {
  console.error(err);
  rollbar.error(err instanceof Error ? err : String(err), {
    url: c.req.url,
    method: c.req.method,
  });
  return c.json({ success: false, message: "Database error." }, 500);
}
