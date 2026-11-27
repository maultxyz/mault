import type { LiveActivity } from "expo-widgets";
import { scanSessionLiveActivity } from "@/features/widgets/components/scan-session-live-activity";
import { SCAN_SESSION_LIVE_ACTIVITY_URL } from "@/lib/constants/live-activity";
import type { ScanSessionLiveActivityProps } from "@/lib/interfaces/live-activity";

let currentActivity: LiveActivity<ScanSessionLiveActivityProps> | null = null;
let lastSnapshot = "";

function updateCurrentActivity(props: ScanSessionLiveActivityProps): boolean {
  if (!currentActivity) return false;
  const snapshot = JSON.stringify(props);
  if (snapshot === lastSnapshot) return true;
  lastSnapshot = snapshot;
  void currentActivity.update(props).catch(() => {});
  return true;
}

export function showScanLiveActivity(props: ScanSessionLiveActivityProps): void {
  try {
    if (updateCurrentActivity(props)) return;
    for (const staleActivity of scanSessionLiveActivity.getInstances()) void staleActivity.end("immediate").catch(() => {});
    currentActivity = scanSessionLiveActivity.start(props, SCAN_SESSION_LIVE_ACTIVITY_URL);
    lastSnapshot = JSON.stringify(props);
  } catch {
    currentActivity = null;
    lastSnapshot = "";
  }
}

export function updateScanLiveActivity(props: ScanSessionLiveActivityProps): void {
  try {
    updateCurrentActivity(props);
  } catch {
    currentActivity = null;
    lastSnapshot = "";
  }
}

export function endScanLiveActivity(finalProps?: ScanSessionLiveActivityProps): void {
  const activity = currentActivity;
  currentActivity = null;
  lastSnapshot = "";
  if (activity) void activity.end("default", finalProps).catch(() => {});
}
