import { collectionValueWidget } from "@/features/widgets/components/collection-value-widget";
import { notificationsWidget } from "@/features/widgets/components/notifications-widget";
import { scannerActivityWidget } from "@/features/widgets/components/scanner-activity-widget";
import type { HomeWidgetSnapshots } from "@/lib/interfaces/widgets";

let lastCollectionValueSnapshot = "";
let lastNotificationsSnapshot = "";
let lastScannerActivityTimeline = "";

export function updateHomeWidgets(snapshots: HomeWidgetSnapshots): void {
  const collectionValueSnapshot = JSON.stringify(snapshots.collectionValue);
  if (collectionValueSnapshot !== lastCollectionValueSnapshot) {
    lastCollectionValueSnapshot = collectionValueSnapshot;
    collectionValueWidget.updateSnapshot(snapshots.collectionValue);
  }
  const notificationsSnapshot = JSON.stringify(snapshots.notifications);
  if (notificationsSnapshot !== lastNotificationsSnapshot) {
    lastNotificationsSnapshot = notificationsSnapshot;
    notificationsWidget.updateSnapshot(snapshots.notifications);
  }
  const scannerActivityTimeline = JSON.stringify(snapshots.scannerActivity);
  if (scannerActivityTimeline !== lastScannerActivityTimeline) {
    lastScannerActivityTimeline = scannerActivityTimeline;
    scannerActivityWidget.updateTimeline(snapshots.scannerActivity);
  }
}
