import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  SCAN_IMAGE_IMPORT_CHECK_BOTH_ORIENTATIONS,
  SCAN_IMAGE_IMPORT_MATCHES_NEEDED,
} from "@/lib/constants/scanner";
import type {
  ScanCards,
  ScanCardsResult,
  ScanCardsSource,
} from "@/lib/interfaces/storage";
import {
  COLOR_BAR_REGIONS_BY_GAME_KEY,
  findCardForScan,
  OCR_REGIONS_BY_GAME_KEY,
  scanCheckCollectionGuid,
  scanOcrMode,
} from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

export function useScanCards(source: ScanCardsSource): ScanCards {
  const { activeOrg } = useOrg();
  const { collections } = useCollections();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanCardsResult | null>(null);
  const resultId = useRef(0);
  const latestSource = useRef(source);
  latestSource.current = source;
  const scanCollectionGuid = scanCheckCollectionGuid(
    source.cards,
    source.checkedScanIds,
  );

  const showResult = (next: Omit<ScanCardsResult, "resultId">) => {
    resultId.current += 1;
    setResult({ ...next, resultId: resultId.current });
  };

  const scanVideoFrame = async (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ) => {
    if (!scanCollectionGuid || !video.videoWidth || !video.videoHeight) return;
    const drawFrame = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
    };
    const gameKey =
      collections.find((collection) => collection.guid === scanCollectionGuid)
        ?.game?.key ?? "";
    drawFrame();
    setIsScanning(true);
    try {
      const { searchCardImageWithConsensus } =
        await import("@/features/scanner/lib/card-image-search");
      const outcome = await searchCardImageWithConsensus(
        canvas,
        drawFrame,
        null,
        { collectionGuid: scanCollectionGuid },
        scanOcrMode(
          orgSettings,
          (OCR_REGIONS_BY_GAME_KEY[gameKey]?.length ?? 0) > 0,
        ),
        SCAN_IMAGE_IMPORT_MATCHES_NEEDED,
        SCAN_IMAGE_IMPORT_CHECK_BOTH_ORIENTATIONS,
        COLOR_BAR_REGIONS_BY_GAME_KEY[gameKey],
      );
      if (!outcome.card) {
        showResult({ kind: "no-match" });
        return;
      }
      const latest = latestSource.current;
      const match = findCardForScan(
        latest.cards,
        latest.checkedScanIds,
        outcome.card,
      );
      if (!match) {
        latest.onNotListed?.(outcome.card.name);
        showResult({ kind: "not-listed", cardName: outcome.card.name });
        return;
      }
      if (match.kind === "unchecked")
        latest.setChecked(match.card.scanId, true);
      showResult({
        kind: match.kind === "unchecked" ? "checked" : "already-checked",
        cardName: match.card.card.name,
        locationName: match.card.locationName,
        position: match.card.position,
      });
    } catch {
      showResult({ kind: "failed" });
    } finally {
      setIsScanning(false);
    }
  };

  return {
    canScan: !!scanCollectionGuid,
    isScanning,
    result,
    scanVideoFrame,
  };
}
