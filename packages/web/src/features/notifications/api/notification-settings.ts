import {
  apiPost,
  API_BASE,
  getAuthHeaders,
  handleForbidden,
} from "@/lib/api/client";
import type {
  NotificationTestOutcome,
  NotificationTestType,
} from "@/lib/interfaces/notifications";
import type { SerialEventReport } from "@magic-vault/shared";

export type { NotificationTestType };

// 409 means the org has no Discord error channel set and 502 that the bot
// couldn't post; both carry a `reason` worth telling the user apart from a
// plain request failure.
export async function sendTestNotification(
  type: NotificationTestType,
): Promise<NotificationTestOutcome> {
  const res = await fetch(`${API_BASE}/api/notifications/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
    body: JSON.stringify({ type }),
  });
  await handleForbidden(res);
  if (res.ok) return "sent";
  if (res.status === 409 || res.status === 502) {
    const body = (await res.json().catch(() => null)) as {
      reason?: NotificationTestOutcome;
    } | null;
    if (body?.reason) return body.reason;
  }
  throw new Error(`API error: ${res.status}`);
}

export async function reportSerialEvent(
  event: SerialEventReport,
): Promise<void> {
  await apiPost("/api/notifications/serial-event", event).catch(() => {});
}
