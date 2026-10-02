import { recordSessionInits } from "@/lib/session-init-registry";
import { useSessionEvents } from "@/features/scanner/api/use-session-monitor";
import { createMonitorLinkStreamSource } from "@/lib/api/stream";
import type { SessionMonitorState } from "@/lib/interfaces/scanner";
import { useEffect, useState } from "react";

export function useSharedSessionMonitor(
  collectionGuid: string | undefined,
  token: string | null,
): SessionMonitorState {
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    if (!collectionGuid || !token) return;
    const es = createMonitorLinkStreamSource(token);
    recordSessionInits(es, [collectionGuid]);
    setEventSource(es);
    return () => {
      es.close();
      setEventSource(null);
    };
  }, [collectionGuid, token]);

  return useSessionEvents(collectionGuid, eventSource);
}
