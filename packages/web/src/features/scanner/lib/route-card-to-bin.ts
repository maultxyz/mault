import { classifyRouteReply } from "@magic-vault/shared";
import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import type { RouteCardToBinParams } from "@/lib/interfaces/scanner";

export async function routeCardToBin({
  route,
  sendRoute,
  toast,
  t,
  failedKey,
  cardName,
  collectionGuid,
  deviceGuid,
  isAutoFeedEnabled,
  isPipelinedFeedEnabled,
  pause,
  triggerAutoFeedAfterRoutedCard,
  onJam,
}: RouteCardToBinParams): Promise<void> {
  const feedNext = isAutoFeedEnabled() && isPipelinedFeedEnabled();
  const response = await sendRoute(route, {
    feedNext,
    requireLoadedCard: true,
  });
  const outcome = classifyRouteReply(response);

  if (outcome.kind === "routed") {
    if (!outcome.fedNext && isAutoFeedEnabled()) {
      await triggerAutoFeedAfterRoutedCard();
    }
    return;
  }

  if (outcome.kind === "noReply") {
    toast.error(t(`${failedKey}.title`), {
      description: t(`${failedKey}.description`, {
        binNumber: route.binNumber,
      }),
    });
  } else if (outcome.kind === "noLoadedCard") {
    toast.error(t("scannedCards.cardMissingBeforeRoute.title"), {
      description: t("scannedCards.cardMissingBeforeRoute.description", {
        binNumber: route.binNumber,
      }),
      duration: Infinity,
      dismissible: true,
    });
  } else if (outcome.kind === "hopperEmpty") {
    toast.error(t("feederEmpty.title"), {
      description: t("feederEmpty.description"),
      duration: Infinity,
      dismissible: true,
    });
  } else if (outcome.kind === "jam") {
    onJam({ module: outcome.module, binNumber: route.binNumber });
  } else if (outcome.kind === "error") {
    toast.error(t("scannedCards.sorterError.title"), {
      description: outcome.message,
      duration: Infinity,
      dismissible: true,
    });
  }

  if (outcome.kind !== "skipped" && outcome.kind !== "stopped") {
    void reportSerialEvent({
      command: "bin",
      sent: true,
      response:
        outcome.kind === "noReply"
          ? null
          : (response as Record<string, unknown>),
      cardName,
      binNumber: route.binNumber,
      collectionGuid,
      deviceGuid,
    });
  }
  pause();
}
