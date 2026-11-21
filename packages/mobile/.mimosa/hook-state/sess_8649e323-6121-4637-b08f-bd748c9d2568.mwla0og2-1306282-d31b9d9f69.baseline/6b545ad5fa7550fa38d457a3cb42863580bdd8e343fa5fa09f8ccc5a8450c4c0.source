import { SCAN_LOCK_TTL_MS } from "@/lib/constants/stream";
import {
  SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS,
  SCANNER_ACTIVITY_WIDGET_URL,
} from "@/lib/constants/widgets";
import type {
  ScannerActivityTimelineEntry,
  ScannerActivityTimelineOptions,
  ScannerActivityWidgetProps,
} from "@/lib/interfaces/widgets";

function formatClockTime(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

function isSameLocalDay(first: number, second: number): boolean {
  return new Date(first).toDateString() === new Date(second).toDateString();
}

export function buildScannerActivityTimeline({
  t,
  locale,
  title,
  locks,
  collectionNames,
  overview,
  scanActivity,
  latestDeviceAlert,
  now,
}: ScannerActivityTimelineOptions): ScannerActivityTimelineEntry[] {
  const activeLocks = Object.entries(locks);
  const scanActivityByCollection = new Map(scanActivity.map((activity) => [activity.collectionGuid, activity]));
  const rateFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const activeScannerProgress = activeLocks.map(([collectionGuid]) => {
    const activity = scanActivityByCollection.get(collectionGuid);
    return activity
      ? t("widgets.scanner.progress", {
          count: activity.sessionScanCount,
          rate: rateFormat.format(activity.scansPerMinute),
        })
      : "";
  });
  const alert = latestDeviceAlert
    ? t("widgets.scanner.alert", {
        title: latestDeviceAlert.title,
        time: formatClockTime(new Date(latestDeviceAlert.createdAt).getTime(), locale),
      })
    : "";
  const activeScanners = activeLocks.map(([collectionGuid, lock]) =>
    t("widgets.scanner.scannerLine", {
      name: lock.displayName,
      collection: collectionNames.get(collectionGuid) ?? t("widgets.scanner.unknownCollection"),
    }),
  );
  const lastScannedCard = overview.recentCards[0];
  const lastScanTimestamp = lastScannedCard ? new Date(lastScannedCard.scannedAt).getTime() : null;
  const lastScan =
    lastScannedCard && lastScanTimestamp !== null
      ? t("widgets.scanner.lastScan", {
          card: lastScannedCard.card.name,
          time: isSameLocalDay(lastScanTimestamp, now)
            ? formatClockTime(lastScanTimestamp, locale)
            : new Date(lastScanTimestamp).toLocaleDateString(locale, { month: "short", day: "numeric" }),
        })
      : "";

  const base: ScannerActivityWidgetProps = {
    status: "ready",
    url: SCANNER_ACTIVITY_WIDGET_URL,
    title,
    message: "",
    activityState: "idle",
    headline: t("widgets.scanner.idle"),
    activeScanners: [],
    activeScannerProgress: [],
    alert,
    moreScannersAfterFirst: "",
    moreScannersAfterList: "",
    scansToday: t("widgets.scansToday", { count: overview.scansToday }),
    lastScan,
    updated: t("widgets.scanner.updated", { time: formatClockTime(now, locale) }),
  };

  if (activeScanners.length === 0) return [{ date: new Date(now), props: base }];

  const scanningUntil = now + SCAN_LOCK_TTL_MS;
  const scannersBeyondList = activeScanners.length - SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS;
  return [
    {
      date: new Date(now),
      props: {
        ...base,
        activityState: "scanning",
        headline: t("widgets.scanner.scanning", { count: activeScanners.length }),
        activeScanners: activeScanners.slice(0, SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS),
        activeScannerProgress: activeScannerProgress.slice(0, SCANNER_ACTIVITY_WIDGET_MAX_LISTED_SCANNERS),
        moreScannersAfterFirst:
          activeScanners.length > 1 ? t("widgets.scanner.more", { count: activeScanners.length - 1 }) : "",
        moreScannersAfterList: scannersBeyondList > 0 ? t("widgets.scanner.more", { count: scannersBeyondList }) : "",
      },
    },
    {
      date: new Date(scanningUntil),
      props: {
        ...base,
        activityState: "unknown",
        headline: t("widgets.scanner.unknown"),
        message: t("widgets.scanner.openToRefresh"),
      },
    },
  ];
}
