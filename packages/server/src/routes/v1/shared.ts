import type { Context } from "hono";
import { PublicApiInputError } from "../../lib/public-api/pagination";

export function publicApiError(c: Context, err: unknown) {
  if (err instanceof PublicApiInputError) {
    return c.json({ success: false, message: err.message }, 400);
  }
  console.error(err);
  return c.json({ success: false, message: "Database error." }, 500);
}
