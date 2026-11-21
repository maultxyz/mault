import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_CARD_CONDITION,
  DEFAULT_PERSISTED_SCAN_SETTINGS,
  hasNonDefaultScanSettings,
  parsePersistedScanSettings,
  scanSettingsForGame,
  serializePersistedScanSettings,
  type CardCondition,
  type Collection,
  type PersistedScanSettings,
} from "@magic-vault/shared";
import { SCAN_SETTINGS_KEY_PREFIX } from "@/lib/constants/storage-keys";
import type {
  ForcedValuesAfterCollectionSwitch,
  PersistedScanSettingsState,
  RetainedScanSettingsNotice,
} from "@/lib/interfaces/scanner";
import { readKv, writeKv } from "@/lib/storage/kv";

function storageKeyFor(orgId: string | null | undefined): string | null {
  return orgId ? SCAN_SETTINGS_KEY_PREFIX + orgId : null;
}

function readStoredScanSettings(storageKey: string | null): PersistedScanSettings {
  return storageKey ? parsePersistedScanSettings(readKv(storageKey)) : DEFAULT_PERSISTED_SCAN_SETTINGS;
}

export function usePersistedScanSettings(
  orgId: string | null | undefined,
  collection: Collection | null,
): PersistedScanSettingsState {
  const storageKey = storageKeyFor(orgId);
  const [settings, setSettingsState] = useState<PersistedScanSettings>(() => readStoredScanSettings(storageKey));
  const settingsRef = useRef(settings);
  const loadedStorageKeyRef = useRef(storageKey);
  const queuedForcedValuesRef = useRef<ForcedValuesAfterCollectionSwitch | null>(null);
  const previousCollectionGuidRef = useRef<string | null>(null);
  const [retainedSettingsNotice, setRetainedSettingsNotice] = useState<RetainedScanSettingsNotice | null>(null);

  const applySettings = useCallback((next: PersistedScanSettings) => {
    settingsRef.current = next;
    setSettingsState(next);
    if (loadedStorageKeyRef.current) writeKv(loadedStorageKeyRef.current, serializePersistedScanSettings(next));
  }, []);

  useEffect(() => {
    if (storageKey === loadedStorageKeyRef.current) return;
    loadedStorageKeyRef.current = storageKey;
    const stored = readStoredScanSettings(storageKey);
    settingsRef.current = stored;
    setSettingsState(stored);
  }, [storageKey]);

  const collectionGuid = collection?.guid ?? null;
  const collectionGame = collection?.game;
  useEffect(() => {
    if (!collectionGuid) return;
    const previousCollectionGuid = previousCollectionGuidRef.current;
    previousCollectionGuidRef.current = collectionGuid;
    const switchedCollection = previousCollectionGuid !== null && previousCollectionGuid !== collectionGuid;
    let next = scanSettingsForGame(settingsRef.current, collectionGame);
    const queuedForcedValues = queuedForcedValuesRef.current;
    if (switchedCollection && queuedForcedValues) {
      queuedForcedValuesRef.current = null;
      next = {
        ...next,
        ...(queuedForcedValues.forcedFoilType !== undefined ? { foilType: queuedForcedValues.forcedFoilType } : {}),
        ...(queuedForcedValues.forcedSetCode !== undefined
          ? { preferredSetCodes: queuedForcedValues.forcedSetCode ? [queuedForcedValues.forcedSetCode] : [] }
          : {}),
      };
    }
    if (next !== settingsRef.current) applySettings(next);
    if (!switchedCollection) return;
    setRetainedSettingsNotice(
      hasNonDefaultScanSettings(next) ? { noticeId: Crypto.randomUUID(), settings: next } : null,
    );
  }, [applySettings, collectionGame, collectionGuid]);

  const dismissRetainedSettingsNotice = useCallback(() => setRetainedSettingsNotice(null), []);
  const applyChosenSettings = useCallback(
    (next: PersistedScanSettings) => {
      setRetainedSettingsNotice(null);
      applySettings(next);
    },
    [applySettings],
  );
  const setFoilType = useCallback(
    (foilType: string | null) => applyChosenSettings({ ...settingsRef.current, foilType }),
    [applyChosenSettings],
  );
  const setPreferredSetCodes = useCallback(
    (preferredSetCodes: string[]) => applyChosenSettings({ ...settingsRef.current, preferredSetCodes }),
    [applyChosenSettings],
  );
  const setCondition = useCallback(
    (condition: CardCondition) => applyChosenSettings({ ...settingsRef.current, condition }),
    [applyChosenSettings],
  );
  const resetScanSettings = useCallback(
    () =>
      applyChosenSettings({
        ...settingsRef.current,
        foilType: null,
        preferredSetCodes: [],
        condition: DEFAULT_CARD_CONDITION,
      }),
    [applyChosenSettings],
  );
  const queueForcedValuesAfterCollectionSwitch = useCallback(
    (forcedValues: ForcedValuesAfterCollectionSwitch | null) => {
      queuedForcedValuesRef.current = forcedValues;
    },
    [],
  );

  return {
    settings,
    settingsRef,
    setFoilType,
    setPreferredSetCodes,
    setCondition,
    queueForcedValuesAfterCollectionSwitch,
    retainedSettingsNotice,
    dismissRetainedSettingsNotice,
    resetScanSettings,
  };
}
