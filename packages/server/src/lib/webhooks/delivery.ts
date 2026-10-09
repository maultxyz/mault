import {
  WEBHOOK_DELIVERY_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_SECRET_PREFIX,
  WEBHOOK_SIGNATURE_HEADER,
} from "@magic-vault/shared";
import { eq, sql } from "drizzle-orm";
import { createHmac, randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";
import { db } from "../../db";
import { webhookEndpoints } from "../../db/schema";
import {
  WEBHOOK_AUTO_DISABLED_REASON,
  WEBHOOK_DELIVERY_TIMEOUT_MS,
  WEBHOOK_LAST_ERROR_MAX_LENGTH,
  WEBHOOK_MAX_CONSECUTIVE_FAILURES,
  WEBHOOK_SECRET_RANDOM_BYTES,
  WEBHOOK_USER_AGENT,
} from "../constants/webhooks";
import type {
  WebhookDeliveryJob,
  WebhookDeliveryResult,
} from "../interfaces/webhooks";
import { parseWebhookUrl, safeLookup } from "./url-safety";

export function generateWebhookSecret(): string {
  return `${WEBHOOK_SECRET_PREFIX}${randomBytes(WEBHOOK_SECRET_RANDOM_BYTES).toString("base64url")}`;
}

export function signWebhookBody(
  secret: string,
  timestamp: number,
  body: string,
): string {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

export function sendWebhook(
  rawUrl: string,
  secret: string,
  job: WebhookDeliveryJob,
): Promise<WebhookDeliveryResult> {
  const url = parseWebhookUrl(rawUrl);
  if (!url) {
    return Promise.resolve({
      ok: false,
      status: null,
      error: "The URL isn't allowed.",
    });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const client = url.protocol === "http:" ? http : https;
  return new Promise((resolve) => {
    const request = client.request(
      url,
      {
        method: "POST",
        lookup: safeLookup,
        timeout: WEBHOOK_DELIVERY_TIMEOUT_MS,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(job.body),
          "User-Agent": WEBHOOK_USER_AGENT,
          [WEBHOOK_EVENT_HEADER]: job.type,
          [WEBHOOK_DELIVERY_HEADER]: job.eventId,
          [WEBHOOK_SIGNATURE_HEADER]: signWebhookBody(
            secret,
            timestamp,
            job.body,
          ),
        },
      },
      (response) => {
        response.resume();
        const status = response.statusCode ?? null;
        const ok = status !== null && status >= 200 && status < 300;
        resolve({
          ok,
          status,
          error: ok ? null : `Responded with HTTP ${status}.`,
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error("Timed out waiting for a response."));
    });
    request.on("error", (err) => {
      resolve({ ok: false, status: null, error: err.message });
    });
    request.end(job.body);
  });
}

export async function recordWebhookDelivery(
  endpointId: number,
  result: WebhookDeliveryResult,
): Promise<void> {
  const now = new Date();
  if (result.ok) {
    await db
      .update(webhookEndpoints)
      .set({
        lastDeliveryAt: now,
        lastStatus: result.status,
        lastError: null,
        consecutiveFailures: 0,
      })
      .where(eq(webhookEndpoints.id, endpointId));
    return;
  }
  const failures = sql`${webhookEndpoints.consecutiveFailures} + 1`;
  const reachedLimit = sql`${failures} >= ${WEBHOOK_MAX_CONSECUTIVE_FAILURES}`;
  await db
    .update(webhookEndpoints)
    .set({
      lastDeliveryAt: now,
      lastStatus: result.status,
      lastError: result.error?.slice(0, WEBHOOK_LAST_ERROR_MAX_LENGTH) ?? null,
      consecutiveFailures: failures,
      disabledAt: sql`CASE WHEN ${reachedLimit} AND ${webhookEndpoints.disabledAt} IS NULL THEN now() ELSE ${webhookEndpoints.disabledAt} END`,
      disabledReason: sql`CASE WHEN ${reachedLimit} AND ${webhookEndpoints.disabledAt} IS NULL THEN ${WEBHOOK_AUTO_DISABLED_REASON} ELSE ${webhookEndpoints.disabledReason} END`,
    })
    .where(eq(webhookEndpoints.id, endpointId));
}
