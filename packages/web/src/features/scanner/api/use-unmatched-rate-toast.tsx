import { useCollections } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { UnmatchedRateToast } from "@/features/scanner/components/unmatched-rate-toast";
import {
  UNMATCHED_RATE_MIN_SCANS,
  UNMATCHED_RATE_THRESHOLD,
  UNMATCHED_RATE_TOAST_COOLDOWN_MS,
  UNMATCHED_RATE_TOAST_ID,
  UNMATCHED_RATE_WINDOW,
} from "@/lib/constants/scanner";
import {
  useSharedStationName,
  useStationToast,
} from "@/features/scanner/api/use-station-toast";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

export function useUnmatchedRateToast() {
  const navigate = useNavigate();
  const toast = useStationToast();
  const stationName = useSharedStationName();
  const { station } = useStation();
  const { setActiveStation } = useStations();
  const { activeOrg } = useOrg();
  const { activeCollection } = useCollections();
  const { data: orgSettings } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const suggestOcr =
    !orgSettings?.ocrEnabled &&
    (OCR_REGIONS_BY_GAME_KEY[activeCollection?.game?.key ?? ""]?.length ?? 0) >
      0;

  const openForStation = (path: string) => {
    setActiveStation(station.id);
    navigate(path);
  };
  const latestRef = useRef({ openForStation, suggestOcr, stationName });
  latestRef.current = { openForStation, suggestOcr, stationName };
  const outcomesRef = useRef<boolean[]>([]);
  const lastShownAtRef = useRef<number | null>(null);

  const showToast = useCallback(() => {
    const {
      openForStation: go,
      suggestOcr: withOcr,
      stationName: name,
    } = latestRef.current;
    toast.custom(
      (id) => (
        <UnmatchedRateToast
          toastId={id}
          stationName={name}
          suggestOcr={withOcr}
          onOpenCalibration={() => go("/app/calibrate/scan-region")}
          onOpenSettings={() => go(SETTINGS_PATHS.scanning)}
        />
      ),
      { id: UNMATCHED_RATE_TOAST_ID, duration: Infinity },
    );
  }, [toast]);

  const recordScanOutcome = useCallback((matched: boolean) => {
    const outcomes = [...outcomesRef.current, matched].slice(
      -UNMATCHED_RATE_WINDOW,
    );
    outcomesRef.current = outcomes;
    if (outcomes.length < UNMATCHED_RATE_MIN_SCANS) return;

    const unmatched = outcomes.filter((isMatch) => !isMatch).length;
    if (unmatched / outcomes.length < UNMATCHED_RATE_THRESHOLD) return;

    const now = Date.now();
    if (
      lastShownAtRef.current !== null &&
      now - lastShownAtRef.current < UNMATCHED_RATE_TOAST_COOLDOWN_MS
    ) {
      return;
    }
    lastShownAtRef.current = now;
    outcomesRef.current = [];
    showToast();
  }, [showToast]);

  return { recordScanOutcome, showToast };
}
