import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { SHEET_DISMISS_FALLBACK_MS } from "@/lib/constants/ui";

const presentedSheetIds = new Set<string>();
const listeners = new Set<() => void>();
let presentedSheetsVersion = 0;

function notifyListeners() {
  presentedSheetsVersion += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPresentedSheetsVersion() {
  return presentedSheetsVersion;
}

function releaseSheet(sheetId: string) {
  if (presentedSheetIds.delete(sheetId)) notifyListeners();
}

function isOtherSheetPresented(sheetId: string) {
  return [...presentedSheetIds].some((presentedSheetId) => presentedSheetId !== sheetId);
}

export function useQueuedSheetPresentation(visible: boolean) {
  const sheetId = useId();
  const [isPresented, setIsPresented] = useState(false);
  useSyncExternalStore(subscribe, getPresentedSheetsVersion);
  const otherSheetIsPresented = isOtherSheetPresented(sheetId);

  useEffect(() => {
    if (visible && !isPresented && !isOtherSheetPresented(sheetId)) {
      presentedSheetIds.add(sheetId);
      setIsPresented(true);
      notifyListeners();
    }
    if (!visible && isPresented) setIsPresented(false);
  }, [visible, isPresented, otherSheetIsPresented, sheetId]);

  useEffect(() => {
    if (isPresented) return undefined;
    const dismissFallbackTimer = setTimeout(() => releaseSheet(sheetId), SHEET_DISMISS_FALLBACK_MS);
    return () => clearTimeout(dismissFallbackTimer);
  }, [isPresented, sheetId]);

  useEffect(() => () => releaseSheet(sheetId), [sheetId]);

  return { isPresented, onSheetDismissed: () => releaseSheet(sheetId) };
}
