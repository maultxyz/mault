import { formatTradeOfferCash, type TradeOfferCash } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { collections, storageLocations } from "../../db/schema";
import { TRADE_OFFER_EMBED_COLOR, TRADE_OFFER_REVIEW_WEB_PATH } from "../constants/discord";
import { getWebUrl } from "../constants/urls";
import type { TradeOfferCreatedNotification } from "../interfaces/discord";
import type { TradeOfferScope } from "../interfaces/trade-offers";
import { sendDiscordNotification } from "./notify";

async function loadTradeOfferSourceName(scope: TradeOfferScope): Promise<string | null> {
  if (scope.kind === "collection") {
    const [row] = await db
      .select({ name: collections.name })
      .from(collections)
      .where(eq(collections.id, scope.collectionId))
      .limit(1);
    return row?.name ?? null;
  }
  const [row] = await db
    .select({ name: storageLocations.name })
    .from(storageLocations)
    .where(eq(storageLocations.id, scope.locationId))
    .limit(1);
  return row?.name ?? null;
}

function describeOffered(offeredCount: number, offeredCash: TradeOfferCash | null): string {
  const parts = [
    offeredCount > 0 && `${offeredCount} ${offeredCount === 1 ? "card" : "cards"}`,
    offeredCash && formatTradeOfferCash(offeredCash),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : "Nothing in return";
}

export async function sendTradeOfferCreatedDiscordNotification(
  notification: TradeOfferCreatedNotification,
): Promise<void> {
  try {
    const { scope, offerGuid, guestName, wantedCount, offeredCount, offeredCash } = notification;
    const sourceName = await loadTradeOfferSourceName(scope);
    const lines = [
      sourceName && `**From link:** ${sourceName}`,
      `**They want:** ${wantedCount} ${wantedCount === 1 ? "card" : "cards"}`,
      `**They offer:** ${describeOffered(offeredCount, offeredCash)}`,
    ].filter(Boolean);
    await sendDiscordNotification(
      scope.orgId,
      {
        title: `New trade offer from ${guestName}`,
        description: lines.join("\n"),
        url: `${getWebUrl()}${TRADE_OFFER_REVIEW_WEB_PATH}/${offerGuid}`,
        color: TRADE_OFFER_EMBED_COLOR,
        timestamp: new Date().toISOString(),
      },
      "trade",
    );
  } catch (err) {
    console.error("[discord] Failed to send trade offer notification:", err);
  }
}
