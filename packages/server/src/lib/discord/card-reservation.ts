import { CARD_RESERVATIONS_WEB_PATH } from "@magic-vault/shared";
import { CARD_RESERVATION_DISCORD_NAMES_MAX } from "../constants/card-reservations";
import { TRADE_OFFER_EMBED_COLOR } from "../constants/discord";
import { getWebUrl } from "../constants/urls";
import type { CardReservationCreatedNotification } from "../interfaces/discord";
import { sendDiscordNotification } from "./notify";

export async function sendCardReservationCreatedDiscordNotification(
  notification: CardReservationCreatedNotification,
): Promise<void> {
  try {
    const { orgId, catalogName, guestName, cardNames, heldCount } = notification;
    const waitingCount = cardNames.length - heldCount;
    const shownNames = cardNames.slice(0, CARD_RESERVATION_DISCORD_NAMES_MAX);
    const hiddenCount = cardNames.length - shownNames.length;
    await sendDiscordNotification(
      orgId,
      {
        title: `New reservation from ${guestName}`,
        description: [
          `**Catalog:** ${catalogName}`,
          `**Held for them:** ${heldCount}`,
          waitingCount > 0 && `**Waiting in line:** ${waitingCount}`,
          "",
          ...shownNames.map((name) => `- ${name}`),
          hiddenCount > 0 && `- and ${hiddenCount} more`,
        ]
          .filter((line) => line !== false)
          .join("\n"),
        url: `${getWebUrl()}${CARD_RESERVATIONS_WEB_PATH}`,
        color: TRADE_OFFER_EMBED_COLOR,
        timestamp: new Date().toISOString(),
      },
      "trade",
    );
  } catch (err) {
    console.error("[discord] Failed to send card reservation notification:", err);
  }
}
