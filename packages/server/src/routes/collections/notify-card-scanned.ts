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

export interface NotifyCardScannedParams {
  orgId: string;
  collectionGuid: string;
  isNewSession: boolean;
  card: PlayingCardWithDistance;
  isFoil?: boolean;
  foilType?: string;
  collectionName: string | undefined;
  gameName: string | undefined;
  gameId: number | null;
  capturedImageUrl?: string;
}

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

  db.query.orgSettings
    .findFirst({
      where: eq(orgSettings.orgId, orgId),
      columns: {
        discordGuildId: true,
        discordNotifyOnScan: true,
        priceSource: true,
      },
    })
    .then(async (row) => {
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

      void postMatchingNotificationRules({
        orgId,
        gameId,
        card,
        embed,
        attachmentDataUrl: capturedImageUrl,
        secondaryImageUrl: referenceImageUrl,
      }).catch((err) => {
        console.error("[discord] Failed to post notification rules:", err);
      });

      if (!row.discordNotifyOnScan) return;

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

      void sendDiscordNotification(
        orgId,
        embed,
        "scan",
        capturedImageUrl,
        referenceImageUrl,
        collectionGuid,
      );
    })
    .catch((err) => {
      console.error("[discord] Failed to send scan notifications:", err);
    });
}
