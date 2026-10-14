import type { WebhookEventType } from "@magic-vault/shared";
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { webhookDeliveries, webhookEndpoints } from "../../db/schema";
import {
  WEBHOOK_DELIVERY_CONCURRENCY,
  WEBHOOK_DELIVERY_ERROR_RETRY_MS,
  WEBHOOK_DELIVERY_LOCK_SECONDS,
  WEBHOOK_DELIVERY_MIN_WAKE_MS,
  WEBHOOK_QUEUE_LIMIT,
  WEBHOOK_RETRY_DELAYS_MS,
} from "../constants/webhooks";
import type {
  ClaimedWebhookDelivery,
  NewWebhookDelivery,
  WebhookJob,
} from "../interfaces/webhooks";
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

let activeDeliveries = 0;
let pumping = false;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;

function wakeAfter(delayMs: number): void {
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = setTimeout(
    () => {
      wakeTimer = null;
      void pumpDeliveries();
    },
    Math.max(delayMs, WEBHOOK_DELIVERY_MIN_WAKE_MS),
  );
  wakeTimer.unref();
}

async function scheduleNextPump(): Promise<void> {
  const [row] = await db
    .select({
      delayMs: sql<number | null>`extract(epoch from min(greatest(${webhookDeliveries.nextAttemptAt}, coalesce(${webhookDeliveries.lockedUntil}, ${webhookDeliveries.nextAttemptAt}))) - now()) * 1000`.mapWith(
        (value) => (value === null ? null : Number(value)),
      ),
    })
    .from(webhookDeliveries);
  if (row?.delayMs == null) {
    if (wakeTimer) clearTimeout(wakeTimer);
    wakeTimer = null;
    return;
  }
  wakeAfter(row.delayMs);
}

async function claimDueDeliveries(
  limit: number,
): Promise<ClaimedWebhookDelivery[]> {
  const due = db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(
      and(
        lte(webhookDeliveries.nextAttemptAt, sql`now()`),
        or(
          isNull(webhookDeliveries.lockedUntil),
          lt(webhookDeliveries.lockedUntil, sql`now()`),
        ),
      ),
    )
    .orderBy(asc(webhookDeliveries.nextAttemptAt))
    .limit(limit)
    .for("update", { skipLocked: true });
  const rows = await db
    .update(webhookDeliveries)
    .set({
      lockedUntil: sql`now() + make_interval(secs => ${WEBHOOK_DELIVERY_LOCK_SECONDS})`,
    })
    .where(inArray(webhookDeliveries.id, due))
    .returning({
      id: webhookDeliveries.id,
      endpointId: webhookDeliveries.endpointId,
      eventId: webhookDeliveries.eventId,
      type: webhookDeliveries.type,
      body: webhookDeliveries.body,
      attempt: webhookDeliveries.attempt,
    });
  return rows.map((row) => ({ ...row, type: row.type as WebhookEventType }));
}

async function finishDelivery(id: number): Promise<void> {
  await db.delete(webhookDeliveries).where(eq(webhookDeliveries.id, id));
}

async function runDelivery(delivery: ClaimedWebhookDelivery): Promise<void> {
  const endpoint = await db.query.webhookEndpoints.findFirst({
    where: eq(webhookEndpoints.id, delivery.endpointId),
    columns: { url: true, secret: true, disabledAt: true },
  });
  if (!endpoint || endpoint.disabledAt) {
    await finishDelivery(delivery.id);
    return;
  }
  const result = await sendWebhook(endpoint.url, endpoint.secret, delivery);
  await recordWebhookDelivery(delivery.endpointId, result);
  const delayMs = WEBHOOK_RETRY_DELAYS_MS[delivery.attempt];
  if (result.ok || delayMs === undefined) {
    await finishDelivery(delivery.id);
    return;
  }
  await db
    .update(webhookDeliveries)
    .set({
      attempt: delivery.attempt + 1,
      nextAttemptAt: sql`now() + make_interval(secs => ${delayMs / 1000})`,
      lockedUntil: null,
    })
    .where(eq(webhookDeliveries.id, delivery.id));
}

async function pumpDeliveries(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    for (;;) {
      const free = WEBHOOK_DELIVERY_CONCURRENCY - activeDeliveries;
      if (free <= 0) return;
      const claimed = await claimDueDeliveries(free);
      if (claimed.length === 0) {
        await scheduleNextPump();
        return;
      }
      for (const delivery of claimed) {
        activeDeliveries++;
        runDelivery(delivery)
          .catch((err) => {
            console.error("[webhooks] Delivery failed:", err);
          })
          .finally(() => {
            activeDeliveries--;
            void pumpDeliveries();
          });
      }
    }
  } catch (err) {
    console.error("[webhooks] Couldn't claim deliveries:", err);
    wakeAfter(WEBHOOK_DELIVERY_ERROR_RETRY_MS);
  } finally {
    pumping = false;
  }
}

export async function queueWebhookDeliveries(
  deliveries: NewWebhookDelivery[],
): Promise<void> {
  if (deliveries.length === 0) return;
  await db.insert(webhookDeliveries).values(deliveries);
  void pumpDeliveries();
}

export function startWebhookDeliveryWorker(): void {
  void pumpDeliveries();
}
