import { useEffect, useState } from "react";
import EventSource from "react-native-sse";
import {
  RECENT_SCANNED_CARDS_COUNT,
  type Collection,
  type ScannedCard,
  type UnmatchedCard,
} from "@magic-vault/shared";
import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import {
  MONITOR_EVENTS,
  MONITOR_MAX_ERRORS,
  STREAM_RECONNECT_DELAY_MS,
} from "@/lib/constants/monitor";
import type { MonitorState } from "@/lib/interfaces/scanner";

const INITIAL_STATE: MonitorState = {
  status: "connecting",
  collectionName: null,
  recentCards: [],
  unmatchedCount: 0,
  viewerCount: 0,
  errors: [],
};

function parse<T>(data: string | null): T | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function useSessionStream(collectionGuid: string): MonitorState {
  const [state, setState] = useState<MonitorState>(INITIAL_STATE);

  useEffect(() => {
    let source: EventSource<string> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    setState(INITIAL_STATE);

    const handle = (name: (typeof MONITOR_EVENTS)[number], data: string | null) => {
      setState((prev) => {
        switch (name) {
          case "session_init": {
            const init = parse<{
              collection: Collection;
              recentCards?: ScannedCard[];
              unmatchedCards?: UnmatchedCard[];
              viewers?: unknown[];
            }>(data);
            if (!init) return prev;
            return {
              ...prev,
              status: "connected",
              collectionName: init.collection.name,
              recentCards: init.recentCards ?? [],
              unmatchedCount: init.unmatchedCards?.length ?? 0,
              viewerCount: init.viewers?.length ?? prev.viewerCount,
            };
          }
          case "viewers_updated":
            return { ...prev, viewerCount: parse<{ viewers: unknown[] }>(data)?.viewers.length ?? prev.viewerCount };
          case "card_added": {
            const card = parse<ScannedCard>(data);
            return card
              ? { ...prev, recentCards: [card, ...prev.recentCards].slice(0, RECENT_SCANNED_CARDS_COUNT) }
              : prev;
          }
          case "card_updated": {
            const card = parse<ScannedCard>(data);
            return card
              ? { ...prev, recentCards: prev.recentCards.map((c) => (c.scanId === card.scanId ? card : c)) }
              : prev;
          }
          case "card_removed": {
            const scanId = parse<{ scanId: string }>(data)?.scanId;
            return { ...prev, recentCards: prev.recentCards.filter((c) => c.scanId !== scanId) };
          }
          case "cards_removed": {
            const ids = new Set(parse<{ scanIds: string[] }>(data)?.scanIds ?? []);
            return { ...prev, recentCards: prev.recentCards.filter((c) => !ids.has(c.scanId)) };
          }
          case "cards_cleared":
            return { ...prev, recentCards: [] };
          case "unmatched_added":
            return { ...prev, unmatchedCount: prev.unmatchedCount + 1 };
          case "unmatched_removed":
            return { ...prev, unmatchedCount: Math.max(0, prev.unmatchedCount - 1) };
          case "unmatched_cleared":
            return { ...prev, unmatchedCount: 0 };
          case "scan_error": {
            const message = parse<{ message: string }>(data)?.message;
            return message
              ? { ...prev, errors: [message, ...prev.errors].slice(0, MONITOR_MAX_ERRORS) }
              : prev;
          }
        }
      });
    };

    const connect = async () => {
      const { token, orgId } = await getRequestAuth();
      if (cancelled || !orgId) return;
      const params = new URLSearchParams({ orgId, guids: collectionGuid });
      if (token) params.set("token", token);
      const es = new EventSource<string>(`${API_BASE}/api/stream?${params.toString()}`, {
        pollingInterval: 0,
      });
      source = es;
      for (const name of MONITOR_EVENTS) {
        es.addEventListener(`session:${collectionGuid}:${name}`, (event) => {
          handle(name, (event as { data: string | null }).data);
        });
      }
      es.addEventListener("open", () => {
        setState((prev) => ({ ...prev, status: "connected" }));
      });
      es.addEventListener("error", () => {
        setState((prev) => ({ ...prev, status: "error" }));
        es.close();
        if (cancelled) return;
        reconnectTimer = setTimeout(() => void connect(), STREAM_RECONNECT_DELAY_MS);
      });
    };

    void connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.removeAllEventListeners();
      source?.close();
    };
  }, [collectionGuid]);

  return state;
}
