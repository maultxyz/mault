import { cardOfTheDayWidget } from "@/features/widgets/components/card-of-the-day-widget";
import { collectionValueWidget } from "@/features/widgets/components/collection-value-widget";
import { notificationsWidget } from "@/features/widgets/components/notifications-widget";
import { scannerActivityWidget } from "@/features/widgets/components/scanner-activity-widget";
import { topCardsWidget } from "@/features/widgets/components/top-cards-widget";
import { totalCardsWidget } from "@/features/widgets/components/total-cards-widget";
import { WIDGET_COLLECTION_PARAMETER } from "@/lib/constants/widgets";
import type { HomeWidgetSnapshots } from "@/lib/interfaces/widgets";

const lastSnapshots = new Map<string, string>();

function changedSince(key: string, value: unknown): boolean {
  const serialized = JSON.stringify(value);
  if (lastSnapshots.get(key) === serialized) return false;
  lastSnapshots.set(key, serialized);
  return true;
}

export function updateHomeWidgets(snapshots: HomeWidgetSnapshots): void {
  const collectionWidgets = [collectionValueWidget, totalCardsWidget, topCardsWidget, cardOfTheDayWidget];
  if (snapshots.collectionOptions.length > 0 && changedSince("collectionOptions", snapshots.collectionOptions)) {
    for (const widget of collectionWidgets) {
      widget.setConfigurationParameterEnum(WIDGET_COLLECTION_PARAMETER, snapshots.collectionOptions);
    }
  }
  const { collectionValue, totalCards, topCards, cardOfTheDay } = snapshots;
  if (collectionValue && changedSince("collectionValue", collectionValue)) {
    collectionValueWidget.updateSnapshot(collectionValue);
  }
  if (totalCards && changedSince("totalCards", totalCards)) totalCardsWidget.updateSnapshot(totalCards);
  if (topCards && changedSince("topCards", topCards)) topCardsWidget.updateSnapshot(topCards);
  if (cardOfTheDay && changedSince("cardOfTheDay", cardOfTheDay)) cardOfTheDayWidget.updateSnapshot(cardOfTheDay);
  if (changedSince("notifications", snapshots.notifications)) notificationsWidget.updateSnapshot(snapshots.notifications);
  if (changedSince("scannerActivity", snapshots.scannerActivity)) {
    scannerActivityWidget.updateTimeline(snapshots.scannerActivity);
  }
}
