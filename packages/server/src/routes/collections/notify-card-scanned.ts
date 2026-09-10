import type { PlayingCardWithDistance } from "@magic-vault/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { orgSettings } from "../../db/schema";
import {
  buildCardScannedEmbed,
  buildScanSessionStartEmbed,
  buildSortingLogicSummary,
  sendDiscordNotification,
} from "../../lib/discord";

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

// Fire-and-forget: posts the scanned card (and, for a brand-new scan
// session, a sorting-logic summary) to the org's configured Discord
// channel. No-ops if the org hasn't turned on scan notifications. Errors
// are logged, never surfaced to the caller - a Discord outage shouldn't
// fail the scan.
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
      columns: { discordNotifyOnScan: true },
    })
    .then(async (row) => {
      if (!row?.discordNotifyOnScan) return;

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

      const { embed, referenceImageUrl } = buildCardScannedEmbed(card, {
        isFoil,
        foilType,
        collectionName,
        gameName,
        collectionGuid,
        capturedImageDataUrl: capturedImageUrl,
      });
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
      console.error("[discord] Failed to check discordNotifyOnScan:", err);
    });
}
