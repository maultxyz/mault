import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { reportServerError } from "../../lib/error-reporting";
import type { AppEnv } from "../../middleware/auth";

export const forgotPasswordRoute = new Hono<AppEnv>().post("/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  if (email) {
    await getOwnAuth()
      .requestPasswordReset({ email })
      .catch((err) => {
        console.error("[local-auth] password reset request failed:", err);
        reportServerError(err);
      });
  }
  return c.json({
    success: true,
    message: "If that email has an account, a reset link has been sent.",
  });
});
