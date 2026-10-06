import {
  reportSerialEvent,
} from "@/features/notifications/api/notification-settings";
import { ROUTE_TIMEOUT_MODULE_PATTERN } from "@/lib/constants/scanner";
import type { RouteCardToBinParams } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";

export async function routeCardToBin({
  route,
  sendRoute,
  t,
  failedKey,
  cardName,
  collectionGuid,
  isAutoFeedEnabled,
  isPipelinedFeedEnabled,
  pause,
  triggerAutoFeed,
  onJam,
}: RouteCardToBinParams): Promise<void> {
  const feedNext = isAutoFeedEnabled() && isPipelinedFeedEnabled();
  const response = await sendRoute(route, { feedNext });

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
    pause();
    return;
  }

  const res = response as Record<string, unknown>;

  if (res.skipped) {
    pause();
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
    pause();
    return;
  }

  if (res.error) {
    const jamModule = String(res.error).match(ROUTE_TIMEOUT_MODULE_PATTERN);
    if (jamModule) {
      onJam({ module: Number(jamModule[1]), binNumber: route.binNumber });
    } else {
      toast.error(t("scannedCards.sorterError.title"), {
        description: String(res.error),
        duration: Infinity,
        dismissible: true,
      });
    }
    void reportSerialEvent({
      command: "bin",
      sent: true,
      response: res,
      cardName,
      binNumber: route.binNumber,
      collectionGuid,
    });
    pause();
    return;
  }

  if (res.fedNext) return;

  if (isAutoFeedEnabled()) {
    triggerAutoFeed();
  }
}
