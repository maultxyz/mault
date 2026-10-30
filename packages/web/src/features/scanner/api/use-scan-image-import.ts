import { billingQueryOptions } from "@/features/billing/api/billing";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  invalidateCollectionCards,
  invalidateUnmatchedCards,
} from "@/features/collections/lib/card-page-cache";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePendingScanSaves } from "@/features/scanner/api/use-pending-scan-saves";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import {
  drawScanImageFile,
  sortFilesByName,
} from "@/features/scanner/lib/scan-image-file";
import {
  SCAN_IMAGE_IMPORT_CHECK_BOTH_ORIENTATIONS,
  SCAN_IMAGE_IMPORT_MATCHES_NEEDED,
} from "@/lib/constants/scanner";
import type {
  QueuedScanImage,
  ScanImageImport,
  ScanImageImportItem,
} from "@/lib/interfaces/scanner";
import { scanLog } from "@/lib/scan-log";
import { generateScanId } from "@/lib/utils";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  OCR_REGIONS_BY_GAME_KEY,
} from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function useScanImageImport(
  collectionGuid: string | undefined,
): ScanImageImport {
  const { t } = useTranslation("cards");
  const queryClient = useQueryClient();
  const { saveCard, saveUnmatched } = usePendingScanSaves();
  const { collections } = useCollections();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const [items, setItems] = useState<ScanImageImportItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasHaltedOnFailure, setHasHaltedOnFailure] = useState(false);
  const hasHaltedOnFailureRef = useRef(false);
  const isRunningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const queueRef = useRef<QueuedScanImage[]>([]);

  const gameKey =
    collections.find((collection) => collection.guid === collectionGuid)?.game
      ?.key ?? "";
  const isOcrSupported = (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0;
  const latest = {
    t,
    saveCard,
    saveUnmatched,
    orgId: activeOrg?.id ?? null,
    ocrEnabled: !!orgSettings?.ocrEnabled && isOcrSupported,
    colorBarRegion: COLOR_BAR_REGIONS_BY_GAME_KEY[gameKey],
  };
  const latestRef = useRef(latest);
  latestRef.current = latest;

  useEffect(
    () => () => {
      stopRequestedRef.current = true;
      queueRef.current = [];
    },
    [collectionGuid],
  );

  const updateItem = useCallback(
    (id: string, update: Partial<ScanImageImportItem>) =>
      setItems((previous) =>
        previous.map((item) => (item.id === id ? { ...item, ...update } : item)),
      ),
    [],
  );

  const identifyAndSaveImage = useCallback(
    async (
      targetCollectionGuid: string,
      item: ScanImageImportItem,
      file: File,
    ): Promise<boolean> => {
      const { t, saveCard, saveUnmatched, orgId, ocrEnabled, colorBarRegion } =
        latestRef.current;
      updateItem(item.id, { status: "identifying" });
      let sourceCanvas: HTMLCanvasElement | null = null;
      try {
        const source = await drawScanImageFile(file).catch(() => null);
        if (!source) {
          updateItem(item.id, {
            status: "failed",
            failureMessage: t("importScans.unreadable"),
          });
          return true;
        }
        sourceCanvas = source.canvas;
        const { searchCardImageWithConsensus } = await import(
          "@/features/scanner/lib/card-image-search"
        );
        const outcome = await searchCardImageWithConsensus(
          source.canvas,
          () => {},
          source.imageContour,
          { collectionGuid: targetCollectionGuid },
          ocrEnabled,
          SCAN_IMAGE_IMPORT_MATCHES_NEEDED,
          SCAN_IMAGE_IMPORT_CHECK_BOTH_ORIENTATIONS,
          colorBarRegion,
        );
        const scanTarget = {
          orgId,
          collectionGuid: targetCollectionGuid,
        };
        const scanId = generateScanId();
        const scannedAt = Date.now();

        if (outcome.card) {
          scanLog(
            `[scan-import] ${file.name} matched ${outcome.card.name} (${outcome.card.id})`,
          );
          const result = await saveCard({
            ...scanTarget,
            record: {
              scanId,
              card: outcome.card,
              scannedAt,
              capturedImageUrl: outcome.debugImageUrl,
              alternativeMatches: outcome.alternativeMatches.length
                ? outcome.alternativeMatches
                : undefined,
              lowConfidenceMatch: outcome.matched?.lowConfidenceMatch || undefined,
              vectorizedOn: outcome.vectorizedOn,
              diagnostics: outcome.matched?.diagnostics,
            },
          });
          if (!result.success) {
            updateItem(item.id, {
              status: "failed",
              failureMessage: result.message,
            });
            return false;
          }
          updateItem(item.id, {
            status: "matched",
            matchedCardName: outcome.card.name,
          });
          return true;
        }

        scanLog(`[scan-import] ${file.name} did not match, saved for review`);
        const result = await saveUnmatched({
          ...scanTarget,
          record: {
            scanId,
            capturedImageUrl: outcome.debugImageUrl,
            scannedAt,
            vectorizedOn: outcome.vectorizedOn,
            diagnostics: outcome.noMatch?.diagnostics,
            embedding: outcome.noMatch?.embedding ?? undefined,
          },
        });
        if (!result.success) {
          updateItem(item.id, {
            status: "failed",
            failureMessage: result.message,
          });
          return false;
        }
        updateItem(item.id, { status: "unmatched" });
        return true;
      } catch (err) {
        console.error(`[scan-import] ${file.name} failed:`, err);
        updateItem(item.id, {
          status: "failed",
          failureMessage: t("importScans.identifyFailed"),
        });
        return true;
      } finally {
        releaseCanvases([sourceCanvas]);
      }
    },
    [updateItem],
  );

  const runQueue = useCallback(() => {
    if (!collectionGuid || isRunningRef.current) return;
    isRunningRef.current = true;
    stopRequestedRef.current = false;
    setIsRunning(true);
    void (async () => {
      try {
        while (!stopRequestedRef.current) {
          const next = queueRef.current.shift();
          if (!next) break;
          const canContinue = await identifyAndSaveImage(
            collectionGuid,
            next.item,
            next.file,
          );
          if (!canContinue) {
            hasHaltedOnFailureRef.current = true;
            setHasHaltedOnFailure(true);
            queueRef.current = [];
            break;
          }
        }
      } finally {
        if (stopRequestedRef.current) queueRef.current = [];
        isRunningRef.current = false;
        setIsRunning(false);
        void invalidateCollectionCards(queryClient, collectionGuid);
        void invalidateUnmatchedCards(queryClient, collectionGuid);
        const { orgId } = latestRef.current;
        if (orgId) {
          void queryClient.invalidateQueries({
            queryKey: billingQueryOptions(orgId).queryKey,
          });
        }
      }
    })();
  }, [collectionGuid, identifyAndSaveImage, queryClient]);

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!collectionGuid || hasHaltedOnFailureRef.current) return;
      const queued = files
        .filter((file) => file.type.startsWith("image/"))
        .map(
          (file): QueuedScanImage => ({
            file,
            item: {
              id: generateScanId(),
              fileName: file.name,
              status: "queued",
            },
          }),
        );
      if (queued.length === 0) return;
      queueRef.current.push(...queued);
      setItems((previous) => [...previous, ...queued.map(({ item }) => item)]);
      runQueue();
    },
    [collectionGuid, runQueue],
  );

  const clear = useCallback(() => {
    if (isRunningRef.current) return;
    queueRef.current = [];
    setItems([]);
    hasHaltedOnFailureRef.current = false;
    setHasHaltedOnFailure(false);
  }, []);

  const importFiles = useCallback(
    (files: File[]) => {
      if (isRunningRef.current) return;
      clear();
      enqueueFiles(sortFilesByName(files));
    },
    [clear, enqueueFiles],
  );

  const stop = useCallback(() => {
    stopRequestedRef.current = true;
    queueRef.current = [];
  }, []);

  return {
    items,
    isRunning,
    hasHaltedOnFailure,
    importFiles,
    enqueueFiles,
    clear,
    stop,
  };
}
