import { useSerial } from "@/features/scanner/api/use-serial";
import type { DeviceCommandOutcome } from "@/lib/interfaces/device-playground";
import { useCallback, useState } from "react";

export function useDeviceCommand() {
  const { sendRawCommand } = useSerial();
  const [outcome, setOutcome] = useState<DeviceCommandOutcome | null>(null);
  const [isSending, setIsSending] = useState(false);

  const send = useCallback(
    async (payload: unknown, timeoutMs: number) => {
      const line =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const sentAt = Date.now();
      setIsSending(true);
      try {
        const result = await sendRawCommand(line, timeoutMs);
        setOutcome({ ...result, sentAt, elapsedMs: Date.now() - sentAt });
      } catch {
        setOutcome({
          status: "noResponse",
          line: null,
          sentAt,
          elapsedMs: Date.now() - sentAt,
        });
      } finally {
        setIsSending(false);
      }
    },
    [sendRawCommand],
  );

  return { send, outcome, isSending };
}
