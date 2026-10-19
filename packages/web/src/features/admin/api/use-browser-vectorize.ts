import { loadSyncCanvas } from "@/features/admin/lib/embed-sync-image";
import { MiloSyncPool } from "@/features/admin/lib/milo-sync-pool";
import { embedCanvas } from "@/features/scanner/lib/milo-client";
import {
  claimBrowserSyncWork,
  submitBrowserSyncWork,
} from "@/lib/api/admin";
import { BROWSER_SYNC_POLL_MS } from "@/lib/constants/admin";
import type { BrowserSyncPace } from "@/lib/interfaces/admin";
import type { BrowserSyncWorkCard } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    const stop = () => {
      clearTimeout(timer);
      resolve();
    };
    if (signal.aborted) {
      stop();
      return;
    }
    signal.addEventListener("abort", stop, { once: true });
  });
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Image failed.";
}

async function claimOne(
  signal: AbortSignal,
  acceptingWork: () => boolean,
): Promise<BrowserSyncWorkCard | null> {
  while (!signal.aborted) {
    if (!acceptingWork()) {
      await sleep(BROWSER_SYNC_POLL_MS, signal);
      continue;
    }
    try {
      const cards = await claimBrowserSyncWork(1);
      if (signal.aborted) return null;
      if (cards[0]) return cards[0];
    } catch {
    }
    await sleep(BROWSER_SYNC_POLL_MS, signal);
  }
  return null;
}

export function useBrowserVectorize(
  enabled: boolean,
  acceptingWork: boolean,
  serverVectorized: number,
  parallel: number,
): BrowserSyncPace {
  const acceptingRef = useRef(acceptingWork);
  acceptingRef.current = acceptingWork;
  const [ahead, setAhead] = useState(0);
  const [embeddingCount, setEmbeddingCount] = useState(0);
  const [trackedServer, setTrackedServer] = useState(serverVectorized);
  let pendingAhead = ahead;
  if (serverVectorized !== trackedServer) {
    const delta = serverVectorized - trackedServer;
    pendingAhead = delta > 0 ? Math.max(0, ahead - delta) : ahead;
    setTrackedServer(serverVectorized);
    setAhead(pendingAhead);
  }

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let stopped = false;
    const signal = controller.signal;

    const bumpEmbedding = (delta: number) => {
      setEmbeddingCount((count) => Math.max(0, count + delta));
    };
    const bumpAhead = () => {
      setAhead((count) => count + 1);
    };

    const runCard = async (card: BrowserSyncWorkCard, pool: MiloSyncPool | null) => {
      bumpEmbedding(1);
      try {
        const canvas = await loadSyncCanvas(card.imageUrl, signal);
        let embedding: number[];
        try {
          embedding = pool ? await pool.embed(canvas) : await embedCanvas(canvas);
        } catch (err) {
          if (!pool || signal.aborted) throw err;
          embedding = await embedCanvas(canvas);
        }
        if (signal.aborted) return;
        await submitBrowserSyncWork([{ cardId: card.cardId, embedding }], []);
        bumpAhead();
      } catch (err) {
        if (signal.aborted) return;
        try {
          await submitBrowserSyncWork([], [
            { cardId: card.cardId, message: errorText(err) },
          ]);
        } catch {
        }
      } finally {
        bumpEmbedding(-1);
      }
    };

    const loop = async (pool: MiloSyncPool | null) => {
      while (!stopped && !signal.aborted) {
        const card = await claimOne(signal, () => acceptingRef.current);
        if (!card || signal.aborted) return;
        await runCard(card, pool);
      }
    };

    void (async () => {
      let pool: MiloSyncPool | null = null;
      try {
        pool = await MiloSyncPool.create(parallel);
      } catch {
        pool = null;
      }
      if (stopped || signal.aborted) {
        pool?.close();
        return;
      }
      await Promise.all(Array.from({ length: parallel }, () => loop(pool)));
      pool?.close();
    })();

    return () => {
      stopped = true;
      controller.abort();
      setEmbeddingCount(0);
    };
  }, [enabled, parallel]);

  useEffect(() => {
    if (enabled) return;
    setAhead(0);
    setTrackedServer(serverVectorized);
    setEmbeddingCount(0);
  }, [enabled, serverVectorized]);

  const vectorized = serverVectorized + (enabled ? pendingAhead : 0);
  return {
    vectorized,
    embeddingCount: enabled ? embeddingCount : 0,
  };
}
