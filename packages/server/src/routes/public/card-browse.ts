import type { PublicCardBrowseInfo } from "@magic-vault/shared";
import { Hono, type Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import { isBusinessToolsAllowed } from "../../lib/business-access";
import { MONITOR_LINK_INVALID_MESSAGE } from "../../lib/constants/auth";
import { PUBLIC_CARD_NOT_FOUND_MESSAGE } from "../../lib/constants/public-cards";
import type { PublicCardBrowseRouteOptions } from "../../lib/interfaces/public-cards";
import { loadOrgPricing } from "../../lib/price-source";
import {
  loadPublicCardDetail,
  loadPublicCardFacets,
  loadPublicCardGames,
  loadPublicCardPage,
  parsePublicCardsRequest,
  publicCardReadsKey,
} from "../../lib/public-card-browse";
import { loadShopPhotoRow, resolveShopPhotoUrl } from "../../lib/shop-photo";
import type { AppEnv } from "../../middleware/auth";
import { isUuid } from "../collections/cards-query";

export function createPublicCardBrowseRoute({
  resolveScope,
  infoExtras,
  readsCache,
}: PublicCardBrowseRouteOptions) {
  const cached = async (
    key: string | null,
    load: () => Promise<unknown>,
  ): Promise<unknown> => {
    const hit = key && readsCache ? readsCache.get(key) : undefined;
    if (hit !== undefined) return hit;
    const data = await load();
    if (key && readsCache && data !== null) readsCache.set(key, data);
    return data;
  };
  const invalidLink = (c: Context<AppEnv>) =>
    c.json({ success: false, message: MONITOR_LINK_INVALID_MESSAGE }, 401);

  return new Hono<AppEnv>()
    .get("/", async (c) => {
      const scope = await resolveScope(c);
      if (!scope) return invalidLink(c);
      const extras = infoExtras ? await infoExtras(c) : {};
      const data = await cached(publicCardReadsKey(scope, "info", {}), () =>
        db.transaction(async (tx) => {
          const pricing = await loadOrgPricing(tx, scope.orgId);
          const { cardCount, games } = await loadPublicCardGames(tx, scope);
          const shopPhotoUrl = (await isBusinessToolsAllowed(tx, scope.orgId))
            ? await resolveShopPhotoUrl(await loadShopPhotoRow(tx, scope.orgId))
            : null;
          const [settings] = await tx
            .select({ primaryColor: orgSettings.primaryColor })
            .from(orgSettings)
            .where(eq(orgSettings.orgId, scope.orgId))
            .limit(1);
          const info: PublicCardBrowseInfo = {
            cardCount,
            showsPrices: scope.showsPrices,
            priceSource: pricing.source,
            conditionMultipliers: pricing.conditionMultipliers,
            games,
            shopPhotoUrl,
            primaryColor: settings?.primaryColor ?? null,
          };
          return info;
        }),
      );
      return c.json({ success: true, data: { ...extras, ...(data as object) } });
    })
    .get("/facets", async (c) => {
      const scope = await resolveScope(c);
      if (!scope) return invalidLink(c);
      const gameKey = c.req.query("game") || null;
      const data = await cached(publicCardReadsKey(scope, "facets", c.req.query()), () =>
        db.transaction(async (tx) =>
          loadPublicCardFacets(tx, scope, gameKey, await loadOrgPricing(tx, scope.orgId)),
        ),
      );
      return c.json({ success: true, data });
    })
    .get("/cards/:scanId", async (c) => {
      const scope = await resolveScope(c);
      if (!scope) return invalidLink(c);
      const scanId = c.req.param("scanId");
      const notFound = () =>
        c.json({ success: false, message: PUBLIC_CARD_NOT_FOUND_MESSAGE }, 404);
      if (!isUuid(scanId)) return notFound();
      const data = await cached(publicCardReadsKey(scope, `card:${scanId}`, {}), () =>
        db.transaction((tx) => loadPublicCardDetail(tx, scope, scanId)),
      );
      if (!data) return notFound();
      return c.json({ success: true, data });
    })
    .get("/cards", async (c) => {
      const scope = await resolveScope(c);
      if (!scope) return invalidLink(c);
      const request = parsePublicCardsRequest(c.req.query(), scope.showsPrices);
      const data = await cached(publicCardReadsKey(scope, "cards", c.req.query()), () =>
        db.transaction(async (tx) =>
          loadPublicCardPage(tx, scope, request, await loadOrgPricing(tx, scope.orgId)),
        ),
      );
      return c.json({ success: true, data });
    });
}
