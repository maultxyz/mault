import { reportSerialEvent } from "@/features/notifications/api/notification-settings";
import type { RouteOptions } from "@/lib/interfaces/scanner";
import type { BinRoute } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { toast } from "sonner";

export interface RouteCardToBinParams {
  route: BinRoute;
  sendRoute: (route: BinRoute, options?: RouteOptions) => Promise<unknown | null>;
  t: TFunction;
  failedKey: string;
  cardName?: string;
  collectionGuid: string | undefined;
  isAutoFeedEnabled: () => boolean;
  isPipelinedFeedEnabled: () => boolean;
  disableAutoFeed: () => void;
  pause: () => void;
  triggerAutoFeed: () => void;
}

export async function routeCardToBin({
  route,
  sendRoute,
  t,
  failedKey,
  cardName,
  collectionGuid,
  isAutoFeedEnabled,
  isPipelinedFeedEnabled,
  disableAutoFeed,
  pause,
  triggerAutoFeed,
}: RouteCardToBinParams): Promise<void> {
  const feedNext = isAutoFeedEnabled() && isPipelinedFeedEnabled();
  const response = await sendRoute(route, { feedNext });
  const stopPipeline = () => {
    disableAutoFeed();
    if (feedNext) pause();
  };

  if (!response) {
    toast.error(t(`${failedKey}.title`), {
      description: t(`${failedKey}.description`, {
        binNumber: route.binNumber,
      }),
    });
    void reportSerialEvent({
      command: "bin",
      sent: true,
      response: null,
      cardName,
      binNumber: route.binNumber,
      collectionGuid,
    });
    stopPipeline();
    return;
  }

  const res = response as Record<string, unknown>;

  if (res.skipped) {
    stopPipeline();
    return;
  }

  if (res.empty) {
    toast.error(t("feederEmpty.title"), {
      description: t("feederEmpty.description"),
      duration: Infinity,
      dismissible: true,
    });
    void reportSerialEvent({
      command: "bin",
      sent: true,
      response: res,
      cardName,
      binNumber: route.binNumber,
      collectionGuid,
    });
    disableAutoFeed();
    pause();
    return;
  }

  if (res.error) {
    toast.error(t("scannedCards.sorterError.title"), {
      description: String(res.error),
      duration: Infinity,
      dismissible: true,
    });
    void reportSerialEvent({
      command: "bin",
      sent: true,
      response: res,
      cardName,
      binNumber: route.binNumber,
      collectionGuid,
    });
    stopPipeline();
    return;
  }

  if (res.fedNext) return;

  if (isAutoFeedEnabled()) {
    triggerAutoFeed();
  }
}
