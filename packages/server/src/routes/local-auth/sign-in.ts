import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import type { AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const signInRoute = new Hono<AppEnv>().post("/sign-in", async (c) => {
  const { email, password } = await c.req.json<{
    email?: string;
    password?: string;
  }>();
  if (!email || !password) {
    return c.json(
      { success: false, message: "Email and password are required." },
      400,
    );
  }

  try {
    const result = await getOwnAuth().signInEmailPassword({ email, password });
    if (result.status === "mfa_required") {
      return c.json(
        { success: false, message: "Multi-factor accounts aren't supported." },
        400,
      );
    }
    return c.json({
      success: true,
      data: {
        token: result.sessionToken,
        user: { id: result.user.id, name: result.user.name, email },
      },
    });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});
