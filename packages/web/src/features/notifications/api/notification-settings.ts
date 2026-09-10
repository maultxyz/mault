import { apiPost } from "@/lib/api/client";
import type { NotificationTestType } from "@/lib/interfaces/notifications";
import type { Response, SerialEventReport } from "@magic-vault/shared";

export type { NotificationTestType };

export async function sendTestNotification(
  type: NotificationTestType,
): Promise<Response> {
  return apiPost<Response>("/api/notifications/test", { type });
}

export async function reportSerialEvent(
  event: SerialEventReport,
): Promise<void> {
  await apiPost("/api/notifications/serial-event", event).catch(() => {});
}
