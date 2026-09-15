import { useCollectionStream } from "@/lib/app-stream";
import type {
  ConnectionStatus,
  SessionError,
  SessionMonitorState,
} from "@/lib/interfaces/scanner";
import type { SessionViewer } from "@/lib/interfaces/collections";
import type { Collection, ScannedCard, UnmatchedCard } from "@magic-vault/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type { SessionError, SessionMonitorState };

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

  const eventSource = useCollectionStream(collectionGuid);

  useEffect(() => {
    if (!collectionGuid) return;
    setStatus("connecting");
    setCards([]);
    setUnmatchedCards([]);
    setCollection(null);
    setViewers([]);
    setErrors([]);
  }, [collectionGuid]);

  useEffect(() => {
    if (!collectionGuid || !eventSource) return;

    const guid = collectionGuid;
    const es = eventSource;
    const scoped = (name: string) => `session:${guid}:${name}`;
    const listeners: Array<[string, (e: Event) => void]> = [];
    const on = (name: string, handler: (e: Event) => void) => {
      es.addEventListener(name, handler);
      listeners.push([name, handler]);
    };

    on(scoped("session_init"), (e) => {
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

    on(scoped("viewers_updated"), (e) => {
      const { viewers: updated } = JSON.parse((e as MessageEvent).data) as { viewers: SessionViewer[] };
      setViewers(updated);
    });

    on(scoped("card_added"), (e) => {
      const card = JSON.parse((e as MessageEvent).data) as ScannedCard;
      setCards((prev) => [card, ...prev]);
    });

    on(scoped("card_updated"), (e) => {
      const updated = JSON.parse((e as MessageEvent).data) as ScannedCard;
      setCards((prev) =>
        prev.map((c) => (c.scanId === updated.scanId ? updated : c)),
      );
    });

    on(scoped("card_removed"), (e) => {
      const { scanId } = JSON.parse((e as MessageEvent).data) as { scanId: string };
      setCards((prev) => prev.filter((c) => c.scanId !== scanId));
    });

    on(scoped("cards_removed"), (e) => {
      const { scanIds } = JSON.parse((e as MessageEvent).data) as { scanIds: string[] };
      const ids = new Set(scanIds);
      setCards((prev) => prev.filter((c) => !ids.has(c.scanId)));
    });

    on(scoped("cards_downloaded"), (e) => {
      const { scanIds } = JSON.parse((e as MessageEvent).data) as { scanIds: string[] };
      const ids = new Set(scanIds);
      setCards((prev) =>
        prev.map((c) => (ids.has(c.scanId) ? { ...c, isDownloaded: true } : c)),
      );
    });

    on(scoped("cards_cleared"), () => {
      setCards([]);
    });

    on(scoped("unmatched_added"), (e) => {
      const card = JSON.parse((e as MessageEvent).data) as UnmatchedCard;
      setUnmatchedCards((prev) => [card, ...prev]);
    });

    on(scoped("unmatched_removed"), (e) => {
      const { scanId } = JSON.parse((e as MessageEvent).data) as { scanId: string };
      setUnmatchedCards((prev) => prev.filter((c) => c.scanId !== scanId));
    });

    on(scoped("unmatched_cleared"), () => {
      setUnmatchedCards([]);
    });

    on(scoped("scan_error"), (e) => {
      const { message } = JSON.parse((e as MessageEvent).data) as { message: string };
      pushError(message);
    });

    // Connection-level, not guid-scoped - the EventSource is shared, so use
    // addEventListener rather than onerror/onopen (which would clobber every
    // other consumer's handler on this same connection).
    on("error", () => {
      setStatus("error");
      pushError(t("sessionMonitor.connectionLost"));
    });

    on("open", () => {
      setStatus("connected");
    });
    // readyState is already OPEN when a second consumer attaches to the
    // already-connected shared EventSource - "open" won't fire again for it.
    if (es.readyState === EventSource.OPEN) setStatus("connected");

    return () => {
      for (const [name, handler] of listeners) es.removeEventListener(name, handler);
      setStatus("closed");
    };
  }, [eventSource, collectionGuid, t]);

  return { collection, cards, unmatchedCards, viewers, errors, status };
}
