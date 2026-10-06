import {
  toPriceSource,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import {
  buildCardScannedEmbed,
  buildScanSessionStartEmbed,
  buildSortingLogicSummary,
  sendDiscordNotification,
} from "../../lib/discord";
import { postMatchingNotificationRules } from "../../lib/notification-rules";
import { enqueueScanNotification } from "../../lib/scan-notification-queue";
import type { NotifyCardScannedParams } from "../../lib/interfaces/collections";

export function notifyCardScanned(params: NotifyCardScannedParams): void {
  const {
    orgId,
    collectionGuid,
    isNewSession,
    card,
    isFoil,
    foilType,
    collectionName,
    gameName,
    gameId,
    capturedImageUrl,
  } = params;

  enqueueScanNotification(async () => {
    const row = await db.query.orgSettings.findFirst({
      where: eq(orgSettings.orgId, orgId),
      columns: {
        discordGuildId: true,
        discordNotifyOnScan: true,
        priceSource: true,
      },
    });
    if (!row?.discordGuildId) return;

    const { embed, referenceImageUrl } = buildCardScannedEmbed(card, {
      isFoil,
      foilType,
      collectionName,
      gameName,
      collectionGuid,
      capturedImageDataUrl: capturedImageUrl,
      priceSource: toPriceSource(row.priceSource),
    });

    const ruleNotifications = postMatchingNotificationRules({
      orgId,
      gameId,
      card,
      scan: { isFoil, foilType },
      embed,
      attachmentDataUrl: capturedImageUrl,
      secondaryImageUrl: referenceImageUrl,
    }).catch((err) => {
      console.error("[discord] Failed to post notification rules:", err);
    });

    if (row.discordNotifyOnScan) {
      if (isNewSession) {
        const sortingLogicSummary = await buildSortingLogicSummary(
          orgId,
          gameId,
        );
        await sendDiscordNotification(
          orgId,
          buildScanSessionStartEmbed(
            collectionName ?? "Unknown collection",
            sortingLogicSummary,
          ),
          "scan",
          undefined,
          undefined,
          collectionGuid,
        );
      }

      await sendDiscordNotification(
        orgId,
        embed,
        "scan",
        capturedImageUrl,
        referenceImageUrl,
        collectionGuid,
      );
    }

    await ruleNotifications;
  });
}
