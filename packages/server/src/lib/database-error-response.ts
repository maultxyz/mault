import type { Context } from "hono";
import { reportServerError } from "./error-reporting";

export function databaseErrorResponse(c: Context, err: unknown) {
  console.error(err);
  reportServerError(err, { url: c.req.url, method: c.req.method });
  return c.json({ success: false, message: "Database error." }, 500);
}
