import type { LiveActivity } from "expo-widgets";
import { scanSessionLiveActivity } from "@/features/widgets/components/scan-session-live-activity";
import { SCAN_SESSION_LIVE_ACTIVITY_URL } from "@/lib/constants/live-activity";
import type { ScanSessionLiveActivityProps } from "@/lib/interfaces/live-activity";

let currentActivity: LiveActivity<ScanSessionLiveActivityProps> | null = null;
let lastSnapshot = "";

export function showScanLiveActivity(props: ScanSessionLiveActivityProps): void {
  const snapshot = JSON.stringify(props);
  if (snapshot === lastSnapshot && currentActivity) return;
  lastSnapshot = snapshot;
  try {
    if (currentActivity) {
      void currentActivity.update(props).catch(() => {});
      return;
    }
    for (const staleActivity of scanSessionLiveActivity.getInstances()) void staleActivity.end("immediate").catch(() => {});
    currentActivity = scanSessionLiveActivity.start(props, SCAN_SESSION_LIVE_ACTIVITY_URL);
  } catch {
    currentActivity = null;
  }
}

export function endScanLiveActivity(finalProps?: ScanSessionLiveActivityProps): void {
  const activity = currentActivity;
  currentActivity = null;
  lastSnapshot = "";
  if (activity) void activity.end("default", finalProps).catch(() => {});
}
