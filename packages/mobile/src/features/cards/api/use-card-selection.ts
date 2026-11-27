import { useCallback, useMemo, useState } from "react";
import type { CardSelectionReference, CardSelectionState } from "@/lib/interfaces/cards";

export function useCardSelection(): CardSelectionState {
  const [isSelecting, setIsSelecting] = useState(false);
  const [collectionGuidByScanId, setCollectionGuidByScanId] = useState<Record<string, string>>({});

  const references = useMemo(
    () => Object.entries(collectionGuidByScanId).map(([scanId, collectionGuid]) => ({ scanId, collectionGuid })),
    [collectionGuidByScanId],
  );

  const isSelected = useCallback(
    (scanIds: string[]) => scanIds.length > 0 && scanIds.every((scanId) => scanId in collectionGuidByScanId),
    [collectionGuidByScanId],
  );

  const toggle = useCallback((toggled: CardSelectionReference[]) => {
    setCollectionGuidByScanId((current) => {
      const next = { ...current };
      if (toggled.every((reference) => reference.scanId in current)) {
        for (const reference of toggled) delete next[reference.scanId];
      } else {
        for (const reference of toggled) next[reference.scanId] = reference.collectionGuid;
      }
      return next;
    });
  }, []);

  const replace = useCallback((next: CardSelectionReference[]) => {
    setCollectionGuidByScanId(Object.fromEntries(next.map((reference) => [reference.scanId, reference.collectionGuid])));
  }, []);

  const clear = useCallback(() => setCollectionGuidByScanId({}), []);
  const startSelecting = useCallback(() => setIsSelecting(true), []);
  const stopSelecting = useCallback(() => {
    setIsSelecting(false);
    setCollectionGuidByScanId({});
  }, []);

  return {
    isSelecting,
    references,
    selectedCount: references.length,
    isSelected,
    startSelecting,
    stopSelecting,
    toggle,
    replace,
    clear,
  };
}
