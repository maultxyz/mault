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
import { renderScanNotificationImage } from "../../lib/discord/scan-notification-image";
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

    let attachment: Promise<string | undefined> | null = null;
    const loadAttachmentDataUrl = () => {
      attachment ??= capturedImageUrl
        ? renderScanNotificationImage(capturedImageUrl, referenceImageUrl)
        : Promise.resolve(undefined);
      return attachment;
    };

    const ruleNotifications = postMatchingNotificationRules({
      orgId,
      gameId,
      card,
      scan: { isFoil, foilType },
      embed,
      loadAttachmentDataUrl,
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
          collectionGuid,
        );
      }

      await sendDiscordNotification(
        orgId,
        embed,
        "scan",
        await loadAttachmentDataUrl(),
        collectionGuid,
      );
    }

    await ruleNotifications;
  });
}
