import type { Collection, ScannedCard, UnmatchedCard } from "@magic-vault/shared";
import { createSessionEventSource } from "@/lib/api/session";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type ConnectionStatus = "connecting" | "connected" | "error" | "closed";

export interface SessionViewer {
  userId: string;
  displayName: string;
}

export interface SessionError {
  id: string;
  message: string;
  timestamp: number;
}

export interface SessionMonitorState {
  collection: Collection | null;
  cards: ScannedCard[];
  unmatchedCards: UnmatchedCard[];
  viewers: SessionViewer[];
  errors: SessionError[];
  status: ConnectionStatus;
}

export function useSessionMonitor(collectionGuid: string | undefined): SessionMonitorState {
  const { t } = useTranslation("scanner");
  const [collection, setCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<ScannedCard[]>([]);
  const [unmatchedCards, setUnmatchedCards] = useState<UnmatchedCard[]>([]);
  const [viewers, setViewers] = useState<SessionViewer[]>([]);
  const [errors, setErrors] = useState<SessionError[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const pushError = (message: string) =>
    setErrors((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, timestamp: Date.now() },
      ...prev,
    ]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!collectionGuid) return;

    let cancelled = false;
    setStatus("connecting");
    setCards([]);
    setUnmatchedCards([]);
    setCollection(null);
    setViewers([]);
    setErrors([]);

    createSessionEventSource(collectionGuid).then((es) => {
      if (cancelled) { es.close(); return; }
      esRef.current = es;

      es.addEventListener("session_init", (e) => {
        const {
          collection,
          cards,
          unmatchedCards: initUnmatched,
          viewers: initViewers,
        } = JSON.parse((e as MessageEvent).data) as {
          collection: Collection;
          cards: ScannedCard[];
          unmatchedCards?: UnmatchedCard[];
          viewers?: SessionViewer[];
        };
        setCollection(collection);
        setCards(cards);
        setUnmatchedCards(initUnmatched ?? []);
        if (initViewers) setViewers(initViewers);
        setStatus("connected");
      });

      es.addEventListener("viewers_updated", (e) => {
        const { viewers: updated } = JSON.parse((e as MessageEvent).data) as { viewers: SessionViewer[] };
        setViewers(updated);
      });

      es.addEventListener("card_added", (e) => {
        const card = JSON.parse((e as MessageEvent).data) as ScannedCard;
        setCards((prev) => [card, ...prev]);
      });

      es.addEventListener("card_updated", (e) => {
        const updated = JSON.parse((e as MessageEvent).data) as ScannedCard;
        setCards((prev) =>
          prev.map((c) => (c.scanId === updated.scanId ? updated : c)),
        );
      });

      es.addEventListener("card_removed", (e) => {
        const { scanId } = JSON.parse((e as MessageEvent).data) as { scanId: string };
        setCards((prev) => prev.filter((c) => c.scanId !== scanId));
      });

      es.addEventListener("cards_removed", (e) => {
        const { scanIds } = JSON.parse((e as MessageEvent).data) as { scanIds: string[] };
        const ids = new Set(scanIds);
        setCards((prev) => prev.filter((c) => !ids.has(c.scanId)));
      });

      es.addEventListener("cards_downloaded", (e) => {
        const { scanIds } = JSON.parse((e as MessageEvent).data) as { scanIds: string[] };
        const ids = new Set(scanIds);
        setCards((prev) =>
          prev.map((c) => (ids.has(c.scanId) ? { ...c, isDownloaded: true } : c)),
        );
      });

      es.addEventListener("cards_cleared", () => {
        setCards([]);
      });

      es.addEventListener("unmatched_added", (e) => {
        const card = JSON.parse((e as MessageEvent).data) as UnmatchedCard;
        setUnmatchedCards((prev) => [card, ...prev]);
      });

      es.addEventListener("unmatched_removed", (e) => {
        const { scanId } = JSON.parse((e as MessageEvent).data) as { scanId: string };
        setUnmatchedCards((prev) => prev.filter((c) => c.scanId !== scanId));
      });

      es.addEventListener("unmatched_cleared", () => {
        setUnmatchedCards([]);
      });

      es.addEventListener("scan_error", (e) => {
        const { message } = JSON.parse((e as MessageEvent).data) as { message: string };
        pushError(message);
      });

      es.onerror = () => {
        setStatus("error");
        pushError(t("sessionMonitor.connectionLost"));
      };

      es.onopen = () => {
        setStatus("connected");
      };
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      setStatus("closed");
    };
  }, [collectionGuid, t]);

  return { collection, cards, unmatchedCards, viewers, errors, status };
}
