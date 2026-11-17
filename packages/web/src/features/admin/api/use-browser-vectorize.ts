import { loadSyncCanvas } from "@/features/admin/lib/embed-sync-image";
import { MiloSyncPool } from "@/features/admin/lib/milo-sync-pool";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import { toast } from "@/lib/toast";
import { cancelSync, claimBrowserSyncWork, submitBrowserSyncWork } from "@/lib/api/admin";
import { BROWSER_SYNC_POLL_MS } from "@/lib/constants/admin";
import type { BrowserSyncPace } from "@/lib/interfaces/admin";
import type { BrowserSyncWorkCard } from "@magic-vault/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, ms);
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
    } catch {}
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
  const { t } = useTranslation("admin");
  const acceptingRef = useRef(acceptingWork);
  acceptingRef.current = acceptingWork;
  const [embeddingCount, setEmbeddingCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let stopped = false;
    const signal = controller.signal;
    let activePool: MiloSyncPool | null = null;
    const stopAfterFailure = () => {
      if (signal.aborted) return;
      stopped = true;
      controller.abort();
      activePool?.close();
      toast.error(t("cardImageVectors.browserStopped"), {
        description: t("cardImageVectors.browserStoppedHint"),
      });
      void cancelSync().catch(() => {});
    };

    const bumpEmbedding = (delta: number) => {
      setEmbeddingCount((count) => Math.max(0, count + delta));
    };
    const runCard = async (
      card: BrowserSyncWorkCard,
      pool: MiloSyncPool,
    ) => {
      bumpEmbedding(1);
      let canvas: HTMLCanvasElement | null = null;
      try {
        canvas = await loadSyncCanvas(card.imageUrl, signal);
        const embedding = await pool.embed(canvas);
        releaseCanvases([canvas]);
        canvas = null;
        let backEmbedding: number[] | undefined;
        if (card.backImageUrl) {
          canvas = await loadSyncCanvas(card.backImageUrl, signal);
          backEmbedding = await pool.embed(canvas);
        }
        if (signal.aborted) return;
        await submitBrowserSyncWork([{ cardId: card.cardId, embedding, backEmbedding }], []);
      } catch (err) {
        if (signal.aborted) return;
        if (pool.failure) {
          stopAfterFailure();
          return;
        }
        try {
          await submitBrowserSyncWork(
            [],
            [{ cardId: card.cardId, message: errorText(err) }],
          );
        } catch {}
      } finally {
        if (canvas) releaseCanvases([canvas]);
        bumpEmbedding(-1);
      }
    };

    const loop = async (pool: MiloSyncPool) => {
      while (!stopped && !signal.aborted) {
        const card = await claimOne(signal, () => acceptingRef.current);
        if (!card || signal.aborted) return;
        await runCard(card, pool);
      }
    };

    void (async () => {
      let pool: MiloSyncPool | null = null;
      try {
        pool = await MiloSyncPool.create(parallel, signal);
        activePool = pool;
      } catch {
        stopAfterFailure();
        return;
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
      activePool?.close();
      setEmbeddingCount(0);
    };
  }, [enabled, parallel, t]);

  return {
    vectorized: serverVectorized,
    embeddingCount: enabled ? embeddingCount : 0,
  };
}
