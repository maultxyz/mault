import type {
  ScanSelectionOptions,
  SelectToggleOptions,
} from "@/lib/interfaces/cards";
import { useCallback, useRef, useState } from "react";

export function useScanSelection<Item>({
  pageItems,
  keyOf,
  scanIdsOf,
}: ScanSelectionOptions<Item>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAnchorKeyRef = useRef<string | null>(null);

  const toggleIds = useCallback((scanIds: string[]) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const allSelected = scanIds.every((id) => next.has(id));
      for (const id of scanIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const selectItem = useCallback(
    (key: string, { shiftKey }: SelectToggleOptions) => {
      const index = pageItems.findIndex((item) => keyOf(item) === key);
      const item = pageItems[index];
      if (!item) return;
      const anchorIndex = selectAnchorKeyRef.current
        ? pageItems.findIndex(
            (candidate) => keyOf(candidate) === selectAnchorKeyRef.current,
          )
        : -1;
      selectAnchorKeyRef.current = key;

      if (!shiftKey || anchorIndex === -1 || anchorIndex === index) {
        toggleIds(scanIdsOf(item));
        return;
      }

      const [from, to] =
        anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex];
      const rangeIds = pageItems.slice(from, to + 1).flatMap(scanIdsOf);
      setSelectedIds((previous) => {
        const select = !scanIdsOf(item).every((id) => previous.has(id));
        const next = new Set(previous);
        for (const id of rangeIds) {
          if (select) next.add(id);
          else next.delete(id);
        }
        return next;
      });
    },
    [pageItems, keyOf, scanIdsOf, toggleIds],
  );

  const togglePage = useCallback(
    () => toggleIds(pageItems.flatMap(scanIdsOf)),
    [pageItems, scanIdsOf, toggleIds],
  );

  const isItemSelected = useCallback(
    (item: Item) => scanIdsOf(item).every((id) => selectedIds.has(id)),
    [scanIdsOf, selectedIds],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    setSelectedIds,
    toggleIds,
    selectItem,
    togglePage,
    isItemSelected,
    clearSelection,
  };
}
