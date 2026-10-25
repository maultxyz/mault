import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { rollbar } from "../../lib/rollbar";
import type { AppEnv } from "../../middleware/auth";

// Deliberately unauthenticated (this is how you recover access when you
// can't sign in at all) and deliberately generic in every response - own-
// auth's requestPasswordReset is already enumeration-safe internally (a
// nonexistent email gets a fabricated token/response with no real email
// sent, so response shape doesn't reveal whether the address exists); this
// route must not undo that by returning anything more specific.
export const forgotPasswordRoute = new Hono<AppEnv>().post("/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (email) {
    await getOwnAuth()
      .requestPasswordReset({ email })
      .catch((err) => {
        console.error("[local-auth] password reset request failed:", err);
        rollbar.error(err instanceof Error ? err : String(err));
      });
  }
  return c.json({
    success: true,
    message: "If that email has an account, a reset link has been sent.",
  });
});
