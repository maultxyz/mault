import { useSerial } from "@/features/scanner/api/use-serial";
import {
  RAW_COMMAND_HISTORY_LIMIT,
  RAW_COMMAND_TIMEOUT_MS,
} from "@/lib/constants/kit-test";
import type { RawCommandHistoryEntry } from "@/lib/interfaces/kit-test";
import { useCallback, useState } from "react";

export function useRawSerialConsole() {
  const { sendRawCommand, sendEmergencyStop } = useSerial();
  const [history, setHistory] = useState<RawCommandHistoryEntry[]>([]);
  const [isSending, setIsSending] = useState(false);

  const appendEntry = useCallback((entry: RawCommandHistoryEntry) => {
    setHistory((previous) =>
      [entry, ...previous].slice(0, RAW_COMMAND_HISTORY_LIMIT),
    );
  }, []);

  const sendCommand = useCallback(
    async (command: Record<string, unknown>) => {
      const line = JSON.stringify(command);
      const sentAt = Date.now();
      setIsSending(true);
      try {
        const result = await sendRawCommand(line, RAW_COMMAND_TIMEOUT_MS);
        appendEntry({
          id: crypto.randomUUID?.() ?? `${sentAt}-${Math.random()}`,
          sentAt,
          command: line,
          status: result.status,
          reply: result.line,
        });
      } finally {
        setIsSending(false);
      }
    },
    [appendEntry, sendRawCommand],
  );

  const stopAllServos = useCallback(async () => {
    const sentAt = Date.now();
    const stopped = await sendEmergencyStop();
    appendEntry({
      id: `${sentAt}-stop`,
      sentAt,
      command: JSON.stringify({ stop: true }),
      status: stopped ? "ok" : "noResponse",
      reply: stopped ? JSON.stringify({ status: "stopped" }) : null,
    });
  }, [appendEntry, sendEmergencyStop]);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { history, isSending, sendCommand, stopAllServos, clearHistory };
}
