import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import type { AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const resetPasswordRoute = new Hono<AppEnv>().post("/reset-password", async (c) => {
  const { token, newPassword } = await c.req.json<{
    token?: string;
    newPassword?: string;
  }>();
  if (!token || !newPassword) {
    return c.json(
      { success: false, message: "Token and new password are required." },
      400,
    );
  }
  try {
    await getOwnAuth().resetPassword({ token, newPassword });
    return c.json({ success: true, data: null });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});
