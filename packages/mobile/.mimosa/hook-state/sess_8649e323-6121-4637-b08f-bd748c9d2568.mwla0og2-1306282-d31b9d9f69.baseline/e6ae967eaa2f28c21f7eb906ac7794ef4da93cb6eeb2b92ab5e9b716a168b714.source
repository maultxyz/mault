import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  DEFAULT_CAPTURE_SETTLE_DELAY_MS,
  DEFAULT_CHECK_BOTH_ORIENTATIONS,
  DEFAULT_MATCHES_NEEDED,
  DEFAULT_SCAN_REGION,
  type ScanRegion,
} from "@magic-vault/shared";
import { saveDevice } from "@/features/calibration/api/calibration-configs";
import { clampRegion } from "@/features/calibration/lib/scan-region";
import { useSorter } from "@/features/sorter/api/use-sorter";
import type { DevicePatch, ScanSettingsDraft } from "@/lib/interfaces/calibration";

export function useScanSettingsDraft(): ScanSettingsDraft {
  const sorter = useSorter();
  const queryClient = useQueryClient();
  const device = sorter.device;
  const [regionDraft, setRegionDraft] = useState<ScanRegion | null>(null);
  const [settleDraft, setSettleDraft] = useState<number | null>(null);
  const [matchesDraft, setMatchesDraft] = useState<number | null>(null);
  const [bothDraft, setBothDraft] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const region = regionDraft ?? device?.scanRegion ?? DEFAULT_SCAN_REGION;
  const captureSettleDelayMs = settleDraft ?? device?.captureSettleDelayMs ?? DEFAULT_CAPTURE_SETTLE_DELAY_MS;
  const matchesNeeded = matchesDraft ?? device?.matchesNeeded ?? DEFAULT_MATCHES_NEEDED;
  const checkBothOrientations = bothDraft ?? device?.checkBothOrientations ?? DEFAULT_CHECK_BOTH_ORIENTATIONS;
  const isDirty = regionDraft !== null || settleDraft !== null || matchesDraft !== null || bothDraft !== null;

  const discard = useCallback(() => {
    setRegionDraft(null);
    setSettleDraft(null);
    setMatchesDraft(null);
    setBothDraft(null);
    setSaveError(false);
  }, []);

  const save = useCallback(async () => {
    if (!device) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      const patch: DevicePatch = {
        ...(regionDraft ? { scanRegion: region } : {}),
        ...(settleDraft !== null ? { captureSettleDelayMs } : {}),
        ...(matchesDraft !== null ? { matchesNeeded } : {}),
        ...(bothDraft !== null ? { checkBothOrientations } : {}),
      };
      const saved = await saveDevice(device.guid, patch);
      sorter.updateDevice(saved);
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      discard();
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [
    device,
    regionDraft,
    settleDraft,
    matchesDraft,
    bothDraft,
    region,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    sorter,
    queryClient,
    discard,
  ]);

  return {
    region,
    captureSettleDelayMs,
    matchesNeeded,
    checkBothOrientations,
    isDirty,
    isSaving,
    saveError,
    setRegion: (next) => setRegionDraft(clampRegion(next)),
    resetRegion: () => setRegionDraft({ ...DEFAULT_SCAN_REGION }),
    setCaptureSettleDelayMs: setSettleDraft,
    setMatchesNeeded: setMatchesDraft,
    setCheckBothOrientations: setBothDraft,
    save,
    discard,
  };
}
