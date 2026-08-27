import { createOwnAuth } from "own-auth";
import { createPostgresAuthStorage } from "own-auth/postgres";
import { pool } from "../db";
import { LocalEmailProvider } from "./local-email-provider";

// Lazy singleton: ./local.ts is imported unconditionally by auth/index.ts
// regardless of AUTH_PROVIDER (so the provider selector stays a plain object
// lookup), so this must not construct the engine at module load - in
// production, createOwnAuth() throws if OWN_AUTH_TOKEN_PEPPER isn't set,
// which would crash a NODE_ENV=production **Neon**-mode deployment that
// never sets it and never calls this.
let instance: ReturnType<typeof createOwnAuth> | undefined;

export function getOwnAuth() {
  if (!instance) {
    // Shares the app's own pg.Pool - own-auth manages its own tables
    // (own_auth_*) in the same database Drizzle uses, the same way
    // neon_auth.* coexists with the app's tables in Neon mode.
    instance = createOwnAuth({
      storage: createPostgresAuthStorage(pool),
      tokenPepper: process.env.OWN_AUTH_TOKEN_PEPPER,
      session: {
        ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      // Default ConsoleEmailProvider throws under NODE_ENV=production (set
      // in Dockerfile.server), which would break org invites entirely since
      // own-auth calls EmailProvider.send() unconditionally - see
      // local-email-provider.ts for what this actually does instead.
      emailProvider: new LocalEmailProvider(),
    });
  }
  return instance;
}
