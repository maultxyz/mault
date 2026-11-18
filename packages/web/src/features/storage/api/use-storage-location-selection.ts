import { useHotkeys } from "@/hooks/use-hotkeys";
import type { StorageLocationSelection } from "@/lib/interfaces/storage";
import type { StorageLocation } from "@magic-vault/shared";
import { useState } from "react";

export function useStorageLocationSelection(
  visibleLocations: StorageLocation[],
): StorageLocationSelection {
  const [checked, setChecked] = useState<Map<string, StorageLocation>>(
    () => new Map(),
  );
  const [lastToggledGuid, setLastToggledGuid] = useState<string | null>(null);
  const clear = () => setChecked(new Map());
  useHotkeys({ clearSelection: checked.size > 0 ? clear : undefined });

  const allVisibleChecked =
    visibleLocations.length > 0 &&
    visibleLocations.every((location) => checked.has(location.guid));

  const toggle = (guid: string, shiftKey: boolean) => {
    const order = visibleLocations.map((location) => location.guid);
    const anchor = lastToggledGuid ? order.indexOf(lastToggledGuid) : -1;
    const target = order.indexOf(guid);
    setChecked((previous) => {
      const next = new Map(previous);
      if (shiftKey && anchor >= 0 && target >= 0) {
        const [from, to] = anchor < target ? [anchor, target] : [target, anchor];
        for (const location of visibleLocations.slice(from, to + 1)) {
          next.set(location.guid, location);
        }
      } else if (next.has(guid)) {
        next.delete(guid);
      } else {
        const location = visibleLocations.find((entry) => entry.guid === guid);
        if (location) next.set(guid, location);
      }
      return next;
    });
    setLastToggledGuid(guid);
  };

  const toggleAllVisible = () =>
    setChecked((previous) => {
      const next = new Map(previous);
      for (const location of visibleLocations) {
        if (allVisibleChecked) next.delete(location.guid);
        else next.set(location.guid, location);
      }
      return next;
    });

  const checkedLocations = [...checked.values()].map(
    (location) =>
      visibleLocations.find((entry) => entry.guid === location.guid) ?? location,
  );

  return {
    checkedGuids: new Set(checked.keys()),
    checkedLocations,
    allVisibleChecked,
    toggle,
    toggleAllVisible,
    clear,
  };
}
