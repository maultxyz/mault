import { useQuery } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useCallback, useRef, useState } from "react";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_SCAN_REGION,
  OCR_REGIONS_BY_GAME_KEY,
  type PlayingCard,
  resolveScanFoilType,
  detectedStampOf,
  type ScannedCard,
  scanOcrMode,
} from "@magic-vault/shared";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { orgSettingsQueryOptions } from "@/features/org/api/org-settings";
import { usePendingSaves } from "@/features/scanner/api/use-pending-saves";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { imageToJpegTempFile } from "@/features/scanner/lib/frame";
import { findCardsInFrame, identifyCardInFrame } from "@/features/scanner/lib/multi-card";
import { useActiveOrgId } from "@/hooks/use-org";
import { BATCH_PHOTO_JPEG_QUALITY } from "@/lib/constants/scanner";
import type {
  BatchScanCard,
  BatchScanMode,
  BatchScanPhotoInfo,
  BatchScanProgress,
  CapturedFrame,
} from "@/lib/interfaces/scanner";

export function useBatchScan(initialMode: BatchScanMode) {
  const orgId = useActiveOrgId();
  const { collection } = useScanTarget();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(orgId));
  const { saveCard, saveUnmatched } = usePendingSaves();
  const [photo, setPhoto] = useState<BatchScanPhotoInfo | null>(null);
  const [cards, setCards] = useState<BatchScanCard[]>([]);
  const [progress, setProgress] = useState<BatchScanProgress | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState(initialMode);
  const [isQueueingRemoval, setIsQueueingRemoval] = useState(false);
  const removal = useScanRemoval({ collectionGuid: collection?.guid ?? null, binConfigs: [] });
  const runIdRef = useRef(0);

  const updateCard = (key: string, change: Partial<BatchScanCard>) =>
    setCards((current) => current.map((card) => (card.key === key ? { ...card, ...change } : card)));

  const processPhoto = useCallback(
    async (frame: CapturedFrame) => {
      if (!collection) return;
      const runId = ++runIdRef.current;
      const isCurrentRun = () => runIdRef.current === runId;
      setCards([]);
      setPhoto({
        uri: await imageToJpegTempFile(frame.image, BATCH_PHOTO_JPEG_QUALITY),
        width: frame.pixels.width,
        height: frame.pixels.height,
      });
      setProgress({ stage: "finding", done: 0, total: 0 });
      const contours = await findCardsInFrame(frame, (done, total) => {
        if (isCurrentRun()) setProgress({ stage: "finding", done, total });
      });
      if (!isCurrentRun()) return;
      const found: BatchScanCard[] = contours.map((contour) => ({
        key: Crypto.randomUUID(),
        contour,
        status: "pending",
        outcome: null,
        correctedCard: null,
        included: true,
      }));
      setCards(found);
      const gameKey = collection.game?.key ?? "";
      const options = {
        scope: { collectionGuid: collection.guid },
        matchesNeeded: 1,
        checkBothOrientations: DEFAULT_CHECK_BOTH_ORIENTATIONS,
        ocrMode: scanOcrMode(orgSettings, (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0),
        colorBarRegionKey: COLOR_BAR_REGIONS_BY_GAME_KEY[gameKey] ? gameKey : null,
        gameKey: gameKey || null,
      };
      for (const [index, card] of found.entries()) {
        if (!isCurrentRun()) return;
        setProgress({ stage: "identifying", done: index, total: found.length });
        updateCard(card.key, { status: "identifying" });
        try {
          const outcome = await identifyCardInFrame(frame, card.contour, options, DEFAULT_SCAN_REGION);
          if (isCurrentRun()) updateCard(card.key, { status: "done", outcome });
        } catch {
          if (isCurrentRun()) updateCard(card.key, { status: "failed" });
        }
      }
      if (isCurrentRun()) setProgress(null);
    },
    [collection, orgSettings],
  );

  const reset = useCallback(() => {
    runIdRef.current += 1;
    setPhoto(null);
    setCards([]);
    setProgress(null);
  }, []);

  const toggleIncluded = (key: string) =>
    setCards((current) => current.map((card) => (card.key === key ? { ...card, included: !card.included } : card)));

  const correctCard = (key: string, correctedCard: PlayingCard) =>
    updateCard(key, { correctedCard, included: true });

  const matchedScansToRemove = cards.flatMap((card) => {
    const matchedCard = card.correctedCard ?? card.outcome?.card;
    if (!card.included || !matchedCard) return [];
    return [
      {
        matchedCard: { ...matchedCard, distance: card.outcome?.card?.distance ?? 0 },
        alternativeMatches: card.correctedCard ? [] : (card.outcome?.alternativeMatches ?? []),
      },
    ];
  });

  const queueCardsForRemoval = async (): Promise<number> => {
    setIsQueueingRemoval(true);
    try {
      return await removal.replaceQueueWithMatchedScans(matchedScansToRemove);
    } finally {
      setIsQueueingRemoval(false);
    }
  };

  const save = async (): Promise<{ saved: number; failed: number }> => {
    if (!collection) return { saved: 0, failed: 0 };
    setIsSaving(true);
    const scannedAt = Date.now();
    const included = cards.filter((card) => card.included && (card.outcome || card.correctedCard));
    const results = await Promise.allSettled(
      included.map((card, index) => {
        const scanId = Crypto.randomUUID();
        const outcome = card.outcome;
        const matchedCard = card.correctedCard ?? outcome?.card ?? null;
        if (matchedCard) {
          const foilType = resolveScanFoilType(
            matchedCard,
            null,
            null,
            collection.game?.foilTypes ?? [],
            outcome?.matched?.diagnostics.printedFoilMarker,
          );
          const record: ScannedCard = {
            scanId,
            card: { ...matchedCard, distance: outcome?.card?.distance ?? 0, confidence: outcome?.card?.confidence ?? 1 },
            scannedAt: scannedAt + index,
            capturedImageUrl: outcome?.capturedImageUrl ?? undefined,
            alternativeMatches:
              !card.correctedCard && outcome?.alternativeMatches.length ? outcome.alternativeMatches : undefined,
            lowConfidenceMatch: (!card.correctedCard && outcome?.matched?.lowConfidenceMatch) || undefined,
            corrected: card.correctedCard ? true : undefined,
            vectorizedOn: "web",
            isFoil: foilType != null || undefined,
            foilType: foilType ?? undefined,
            stamp: card.correctedCard
              ? undefined
              : (detectedStampOf(outcome?.matched?.diagnostics.stampDetection) ?? undefined),
          };
          return saveCard({
            orgId,
            collectionGuid: collection.guid,
            record: { ...record, diagnostics: outcome?.matched?.diagnostics },
          });
        }
        return saveUnmatched({
          orgId,
          collectionGuid: collection.guid,
          record: {
            scanId,
            scannedAt: scannedAt + index,
            capturedImageUrl: outcome?.capturedImageUrl ?? undefined,
            vectorizedOn: "web",
            diagnostics: outcome?.noMatch?.diagnostics,
            embedding: outcome?.noMatch?.embedding ?? undefined,
          },
        });
      }),
    );
    setIsSaving(false);
    const saved = results.filter((result) => result.status === "fulfilled" && result.value.success).length;
    return { saved, failed: results.length - saved };
  };

  return {
    collection,
    photo,
    cards,
    progress,
    isSaving,
    mode,
    setMode,
    removal,
    removableCount: matchedScansToRemove.length,
    isQueueingRemoval,
    queueCardsForRemoval,
    processPhoto,
    reset,
    toggleIncluded,
    correctCard,
    save,
  };
}
