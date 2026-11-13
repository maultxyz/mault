import type {
  CardCondition,
  PiScanSessionSettingsBody,
  PiScanSessionState,
} from "@magic-vault/shared";
import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { usePiHost } from "@/hooks/use-pi-host";
import { toast } from "@/lib/toast";
import { piScanHoldsPort, updatePiScanSettings } from "./pi-scan-session";
import {
  applyPiScanState,
  getPiScanState,
  subscribePiScan,
} from "../lib/pi-scan-store";

import type { PiScanSettingsOptions } from "@/lib/interfaces/scanner";

export function usePiScanSettings(options: PiScanSettingsOptions) {
  const piHost = usePiHost();
  const { t } = useTranslation("scanner");
  const state = useSyncExternalStore(subscribePiScan, getPiScanState);
  const { collectionGuid, setFoilType, setPreferredSetCodes, setCondition } =
    options;
  const belongsToCollection = useCallback(
    (current: PiScanSessionState) =>
      piHost &&
      !!collectionGuid &&
      current.collectionGuid === collectionGuid &&
      piScanHoldsPort(current),
    [collectionGuid, piHost],
  );

  const update = useCallback(
    (patch: PiScanSessionSettingsBody) => {
      if (!belongsToCollection(getPiScanState())) return;
      void updatePiScanSettings(patch)
        .then((result) => {
          if (!result.success) throw new Error(result.message);
          if (result.data) applyPiScanState(result.data);
        })
        .catch(() => toast.error(t("serial.connectionFailed.title")));
    },
    [belongsToCollection, t],
  );

  const changeFoilType = useCallback(
    (value: string | null) => {
      setFoilType(value);
      update({ foilType: value });
    },
    [setFoilType, update],
  );
  const changePreferredSetCodes = useCallback(
    (value: string[]) => {
      setPreferredSetCodes(value);
      update({ preferredSetCodes: value });
    },
    [setPreferredSetCodes, update],
  );

  const changeCondition = useCallback(
    (value: CardCondition) => {
      setCondition?.(value);
      update({ condition: value });
    },
    [setCondition, update],
  );

  const live = belongsToCollection(state);
  return {
    condition:
      live && state.condition !== undefined
        ? state.condition
        : options.condition,
    setCondition: changeCondition,
    foilType:
      live && state.foilType !== undefined ? state.foilType : options.foilType,
    preferredSetCodes:
      live && state.preferredSetCodes !== undefined
        ? state.preferredSetCodes
        : options.preferredSetCodes,
    setFoilType: changeFoilType,
    setPreferredSetCodes: changePreferredSetCodes,
  };
}
