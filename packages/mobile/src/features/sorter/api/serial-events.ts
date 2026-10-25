import type { SerialEventReport } from "@magic-vault/shared";
import { apiPost } from "@/lib/api/client";

export function reportSerialEvent(event: SerialEventReport): void {
  void apiPost("/api/notifications/serial-event", event).catch(() => {});
}
