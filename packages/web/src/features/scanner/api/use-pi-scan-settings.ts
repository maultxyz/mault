import type { PiScanSessionSettingsBody, PiScanSessionState } from "@magic-vault/shared";
import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { usePiHost } from "@/hooks/use-pi-host";
import { toast } from "@/lib/toast";
import { piScanHoldsPort, updatePiScanSettings } from "./pi-scan-session";
import { applyPiScanState, getPiScanState, subscribePiScan } from "../lib/pi-scan-store";

interface Options {
  collectionGuid: string | undefined;
  foilType: string | null;
  preferredSetCodes: string[];
  setFoilType: (value: string | null) => void;
  setPreferredSetCodes: (value: string[]) => void;
}

export function usePiScanSettings(options: Options) {
  const piHost = usePiHost();
  const { t } = useTranslation("scanner");
  const state = useSyncExternalStore(subscribePiScan, getPiScanState);
  const { collectionGuid, setFoilType, setPreferredSetCodes } = options;
  const belongsToCollection = useCallback((current: PiScanSessionState) =>
    piHost && !!collectionGuid && current.collectionGuid === collectionGuid && piScanHoldsPort(current),
  [collectionGuid, piHost]);

  // Only explicit edits write settings. Mounting, polling, or reconnecting never does.
  const update = useCallback((patch: PiScanSessionSettingsBody) => {
    if (!belongsToCollection(getPiScanState())) return;
    void updatePiScanSettings(patch).then((result) => {
      if (!result.success) throw new Error(result.message);
      if (result.data) applyPiScanState(result.data);
    }).catch(() => toast.error(t("serial.connectionFailed.title")));
  }, [belongsToCollection, t]);

  const changeFoilType = useCallback((value: string | null) => {
    setFoilType(value);
    update({ foilType: value });
  }, [setFoilType, update]);
  const changePreferredSetCodes = useCallback((value: string[]) => {
    setPreferredSetCodes(value);
    update({ preferredSetCodes: value });
  }, [setPreferredSetCodes, update]);

  const live = belongsToCollection(state);
  return {
    foilType: live && state.foilType !== undefined ? state.foilType : options.foilType,
    preferredSetCodes: live && state.preferredSetCodes !== undefined
      ? state.preferredSetCodes : options.preferredSetCodes,
    setFoilType: changeFoilType,
    setPreferredSetCodes: changePreferredSetCodes,
  };
}
