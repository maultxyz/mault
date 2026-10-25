import { createOwnAuth } from "own-auth";
import { createPostgresAuthStorage } from "own-auth/postgres";
import { pool } from "../db";
import { LocalEmailProvider } from "./local-email-provider";

let instance: ReturnType<typeof createOwnAuth> | undefined;

export function getOwnAuth() {
  if (!instance) {
    instance = createOwnAuth({
      storage: createPostgresAuthStorage(pool),
      tokenPepper: process.env.OWN_AUTH_TOKEN_PEPPER,
      session: {
        ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      emailProvider: new LocalEmailProvider(),
    });
  }
  return instance;
}
