import { useOrg } from "@/features/companies/api/use-organization";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import {
  readStoredScanSettings,
  scanSettingsStorageKey,
  writeStoredScanSettings,
} from "@/features/scanner/lib/scan-settings-storage";
import { RETAINED_SCAN_SETTINGS_TOAST_ID } from "@/lib/constants/scanner";
import type { PersistedScanSettingsState } from "@/lib/interfaces/scanner";
import {
  DEFAULT_CARD_CONDITION,
  hasNonDefaultScanSettings,
  scanSettingsForGame,
  type CardCondition,
  type Collection,
  type PersistedScanSettings,
} from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";

export function usePersistedScanSettings(
  activeCollection: Collection | null | undefined,
  resetScanSettingsRef: RefObject<() => void>,
): PersistedScanSettingsState {
  const { t } = useTranslation("scanner");
  const { t: tCards } = useTranslation("cards");
  const toast = useStationToast();
  const { activeOrg } = useOrg();
  const storageKey = scanSettingsStorageKey(activeOrg?.id);
  const [settings, setSettingsState] = useState<PersistedScanSettings>(() =>
    readStoredScanSettings(storageKey),
  );
  const settingsRef = useRef(settings);
  const loadedStorageKeyRef = useRef(storageKey);
  const queuedSetCodesAfterSwitchRef = useRef<string[] | null>(null);
  const previousCollectionGuidRef = useRef<string | undefined>(undefined);

  const applySettings = useCallback((next: PersistedScanSettings) => {
    settingsRef.current = next;
    setSettingsState(next);
    writeStoredScanSettings(loadedStorageKeyRef.current, next);
  }, []);

  useEffect(() => {
    if (storageKey === loadedStorageKeyRef.current) return;
    loadedStorageKeyRef.current = storageKey;
    const stored = readStoredScanSettings(storageKey);
    settingsRef.current = stored;
    setSettingsState(stored);
  }, [storageKey]);

  const showRetainedSettingsNotice = useCallback(
    (retained: PersistedScanSettings) => {
      const descriptions = [
        retained.foilType
          ? t("retainedScanSettings.foil", { type: retained.foilType })
          : null,
        retained.condition !== DEFAULT_CARD_CONDITION
          ? t("retainedScanSettings.condition", {
              condition: tCards(`condition.names.${retained.condition}`),
            })
          : null,
        retained.preferredSetCodes.length > 0
          ? t("retainedScanSettings.sets", {
              count: retained.preferredSetCodes.length,
              sets: retained.preferredSetCodes
                .map((code) => code.toUpperCase())
                .join(", "),
            })
          : null,
      ].filter((description) => description !== null);
      toast.info(t("retainedScanSettings.title"), {
        id: RETAINED_SCAN_SETTINGS_TOAST_ID,
        description: descriptions.join(", "),
        action: {
          label: t("retainedScanSettings.reset"),
          onClick: () => resetScanSettingsRef.current(),
        },
      });
    },
    [resetScanSettingsRef, t, tCards, toast],
  );

  const collectionGuid = activeCollection?.guid;
  const collectionGame = activeCollection?.game;
  useEffect(() => {
    if (!collectionGuid) return;
    const previousCollectionGuid = previousCollectionGuidRef.current;
    previousCollectionGuidRef.current = collectionGuid;
    const switchedCollection =
      previousCollectionGuid !== undefined &&
      previousCollectionGuid !== collectionGuid;
    let next = scanSettingsForGame(settingsRef.current, collectionGame);
    const queuedSetCodes = queuedSetCodesAfterSwitchRef.current;
    if (switchedCollection && queuedSetCodes !== null) {
      queuedSetCodesAfterSwitchRef.current = null;
      next = { ...next, preferredSetCodes: queuedSetCodes };
    }
    if (next !== settingsRef.current) applySettings(next);
    if (switchedCollection && hasNonDefaultScanSettings(next)) {
      showRetainedSettingsNotice(next);
    }
  }, [applySettings, collectionGame, collectionGuid, showRetainedSettingsNotice]);

  const setFoilType = useCallback(
    (foilType: string | null) =>
      applySettings({ ...settingsRef.current, foilType }),
    [applySettings],
  );
  const setPreferredSetCodes = useCallback(
    (preferredSetCodes: string[]) =>
      applySettings({ ...settingsRef.current, preferredSetCodes }),
    [applySettings],
  );
  const setCondition = useCallback(
    (condition: CardCondition) =>
      applySettings({ ...settingsRef.current, condition }),
    [applySettings],
  );
  const setPreferredSetCodesAfterCollectionSwitch = useCallback(
    (setCodes: string[]) => {
      queuedSetCodesAfterSwitchRef.current = setCodes;
    },
    [],
  );

  return {
    settings,
    settingsRef,
    setFoilType,
    setPreferredSetCodes,
    setCondition,
    setPreferredSetCodesAfterCollectionSwitch,
  };
}
