import { eq } from "drizzle-orm";
import { db } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import {
  WEBHOOK_DELIVERY_CONCURRENCY,
  WEBHOOK_QUEUE_LIMIT,
  WEBHOOK_RETRY_DELAYS_MS,
} from "../constants/webhooks";
import type { WebhookDeliveryJob, WebhookJob } from "../interfaces/webhooks";
import { recordWebhookDelivery, sendWebhook } from "./delivery";

const pendingJobs: WebhookJob[] = [];
let runningJobs = 0;

function drainQueue(): void {
  while (runningJobs < WEBHOOK_DELIVERY_CONCURRENCY && pendingJobs.length) {
    const job = pendingJobs.shift()!;
    runningJobs++;
    job()
      .catch((err) => {
        console.error("[webhooks] Job failed:", err);
      })
      .finally(() => {
        runningJobs--;
        setImmediate(drainQueue);
      });
  }
}

export function enqueueWebhookJob(job: WebhookJob): void {
  if (pendingJobs.length >= WEBHOOK_QUEUE_LIMIT) {
    pendingJobs.shift();
    console.warn("[webhooks] Queue full, dropped oldest job");
  }
  pendingJobs.push(job);
  setImmediate(drainQueue);
}

async function runDelivery(job: WebhookDeliveryJob): Promise<void> {
  const endpoint = await db.query.webhookEndpoints.findFirst({
    where: eq(webhookEndpoints.id, job.endpointId),
    columns: { url: true, secret: true, disabledAt: true },
  });
  if (!endpoint || endpoint.disabledAt) return;
  const result = await sendWebhook(endpoint.url, endpoint.secret, job);
  await recordWebhookDelivery(job.endpointId, result);
  const delay = WEBHOOK_RETRY_DELAYS_MS[job.attempt];
  if (!result.ok && delay !== undefined) {
    setTimeout(
      () => enqueueWebhookDelivery({ ...job, attempt: job.attempt + 1 }),
      delay,
    ).unref();
  }
}

export function enqueueWebhookDelivery(job: WebhookDeliveryJob): void {
  enqueueWebhookJob(() => runDelivery(job));
}
