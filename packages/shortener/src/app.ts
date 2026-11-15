import {
  SHORTENER_API_SECRET_HEADER,
  SHORTENER_INTERNAL_DELETE_LINKS_PATH,
  SHORTENER_INTERNAL_LINKS_PATH,
  SHORT_LINK_CODE_PATTERN,
  SHORT_LINK_NOT_FOUND_PATH,
  SHORT_LINK_PATH_PREFIX,
  shortenerDeleteLinksSchema,
  shortenerRegisterLinksSchema,
} from "@magic-vault/shared";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import {
  REDIRECT_CACHE_CONTROL,
  SHORTENER_HEALTH_PATH,
  SHORTENER_INVALID_REQUEST_MESSAGE,
  SHORTENER_LINK_NOT_FOUND_MESSAGE,
  SHORTENER_SECRET_MISSING_MESSAGE,
  SHORTENER_SERVER_ERROR_MESSAGE,
  SHORTENER_UNAUTHORIZED_MESSAGE,
} from "./lib/constants/shortener";
import type { ShortenerConfig, ShortLinkStore } from "./lib/interfaces/shortener";
import { secretsMatch } from "./lib/secret";

async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export function createShortenerApp(store: ShortLinkStore, config: ShortenerConfig): Hono {
  const requireApiSecret: MiddlewareHandler = async (c, next) => {
    if (!config.apiSecret) {
      return c.json({ success: false, message: SHORTENER_SECRET_MISSING_MESSAGE }, 503);
    }
    const providedSecret = c.req.header(SHORTENER_API_SECRET_HEADER) ?? "";
    if (!secretsMatch(config.apiSecret, providedSecret)) {
      return c.json({ success: false, message: SHORTENER_UNAUTHORIZED_MESSAGE }, 401);
    }
    await next();
  };

  async function redirectToTarget(c: Context, origin: string) {
    c.header("Cache-Control", REDIRECT_CACHE_CONTROL);
    c.header("Referrer-Policy", "no-referrer");
    const code = c.req.param("code") ?? "";
    const targetPath = SHORT_LINK_CODE_PATTERN.test(code)
      ? await store.findTargetPath(code)
      : null;
    return c.redirect(`${origin}${targetPath ?? SHORT_LINK_NOT_FOUND_PATH}`, 302);
  }

  const app = new Hono();
  app.use("*", async (c, next) => {
    await next();
    c.header("X-Content-Type-Options", "nosniff");
  });
  app.get(SHORTENER_HEALTH_PATH, (c) => c.text("ok"));

  app.post(SHORTENER_INTERNAL_DELETE_LINKS_PATH, requireApiSecret, async (c) => {
    const request = shortenerDeleteLinksSchema.safeParse(await readJsonBody(c));
    if (!request.success) {
      return c.json({ success: false, message: SHORTENER_INVALID_REQUEST_MESSAGE }, 400);
    }
    await store.deleteLinks(request.data.codes);
    return c.json({ success: true, data: null });
  });
  app.post(SHORTENER_INTERNAL_LINKS_PATH, requireApiSecret, async (c) => {
    const request = shortenerRegisterLinksSchema.safeParse(await readJsonBody(c));
    if (!request.success) {
      return c.json({ success: false, message: SHORTENER_INVALID_REQUEST_MESSAGE }, 400);
    }
    await store.saveLinks(request.data.links);
    return c.json({ success: true, data: null });
  });
  app.get(`${SHORTENER_INTERNAL_LINKS_PATH}/:code`, requireApiSecret, async (c) => {
    const code = c.req.param("code");
    const targetPath = SHORT_LINK_CODE_PATTERN.test(code)
      ? await store.findTargetPath(code)
      : null;
    if (!targetPath) {
      return c.json({ success: false, message: SHORTENER_LINK_NOT_FOUND_MESSAGE }, 404);
    }
    return c.json({ success: true, data: { targetPath } });
  });

  app.get(`${SHORT_LINK_PATH_PREFIX}/:code`, (c) => redirectToTarget(c, ""));
  if (config.shortLinkTargetOrigin) {
    const targetOrigin = config.shortLinkTargetOrigin;
    app.get("/:code", (c) => redirectToTarget(c, targetOrigin));
    app.get("/", (c) => c.redirect(targetOrigin, 302));
  }

  app.onError((error, c) => {
    console.error("[shortener]", error);
    return c.json({ success: false, message: SHORTENER_SERVER_ERROR_MESSAGE }, 500);
  });
  return app;
}
