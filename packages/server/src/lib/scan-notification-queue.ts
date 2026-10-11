import {
  SCAN_NOTIFICATION_CONCURRENCY,
  SCAN_NOTIFICATION_QUEUE_LIMIT,
} from "./constants/discord";
import type { ScanNotificationJob } from "./interfaces/scan-notification-queue";

const pendingJobs: ScanNotificationJob[] = [];
let runningJobs = 0;

function drainQueue(): void {
  while (runningJobs < SCAN_NOTIFICATION_CONCURRENCY && pendingJobs.length) {
    const job = pendingJobs.shift()!;
    runningJobs++;
    job()
      .catch((err) => {
        console.error("[discord] Scan notification job failed:", err);
      })
      .finally(() => {
        runningJobs--;
        setImmediate(drainQueue);
      });
  }
}

export function enqueueScanNotification(job: ScanNotificationJob): void {
  if (pendingJobs.length >= SCAN_NOTIFICATION_QUEUE_LIMIT) {
    pendingJobs.shift();
    console.warn("[discord] Scan notification queue full, dropped oldest job");
  }
  pendingJobs.push(job);
  setImmediate(drainQueue);
}
