import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { db } from "../../db";
import { platformUserRoles } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

export const signUpRoute = new Hono<AppEnv>().post("/sign-up", async (c) => {
  const { email, password, name } = await c.req.json<{
    email?: string;
    password?: string;
    name?: string;
  }>();
  if (!email || !password) {
    return c.json(
      { success: false, message: "Email and password are required." },
      400,
    );
  }

  try {
    const result = await getOwnAuth().signUpEmailPassword({
      email,
      password,
      name,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(platformUserRoles);
    if (Number(count) === 0) {
      await db
        .insert(platformUserRoles)
        .values({ userId: result.user.id, role: "admin" })
        .onConflictDoNothing();
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
