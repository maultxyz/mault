import { serve } from "@hono/node-server";
import { createShortenerApp } from "./app";
import { readShortenerConfig } from "./lib/config";
import { DEFAULT_SHORTENER_HOST, DEFAULT_SHORTENER_PORT } from "./lib/constants/shortener";
import {
  createPostgresPool,
  createPostgresShortLinkStore,
  ensureShortLinkSchema,
} from "./lib/postgres-store";

async function main(): Promise<void> {
  const config = readShortenerConfig(process.env);
  const pool = createPostgresPool(process.env);
  await ensureShortLinkSchema(pool);
  if (!config.apiSecret) {
    console.warn("[shortener] SHORTENER_API_SECRET is not set, so the API can't register links.");
  }
  const port = parseInt(process.env.SHORTENER_PORT ?? String(DEFAULT_SHORTENER_PORT));
  const hostname = process.env.SHORTENER_HOST || DEFAULT_SHORTENER_HOST;
  const app = createShortenerApp(createPostgresShortLinkStore(pool), config);
  serve({ fetch: app.fetch, port, hostname }, () => {
    console.log(`[shortener] Listening on ${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error("[shortener] Failed to start", error);
  process.exit(1);
});
