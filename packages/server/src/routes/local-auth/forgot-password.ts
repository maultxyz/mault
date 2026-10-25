import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { rollbar } from "../../lib/rollbar";
import type { AppEnv } from "../../middleware/auth";

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
