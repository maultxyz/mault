import { loadStoredCardCount } from "@/features/collections/api/collection-cards";
import { useEffect, useState } from "react";

export function useStoredCardCount(
  collectionGuid: string | undefined,
  scanIds: Iterable<string> | null,
  enabled: boolean,
): number {
  const [storedCount, setStoredCount] = useState(0);

  useEffect(() => {
    if (!collectionGuid || !scanIds || !enabled) return;
    let cancelled = false;
    loadStoredCardCount(collectionGuid, [...scanIds])
      .then((count) => {
        if (!cancelled) setStoredCount(count);
      })
      .catch((err) => console.error("Failed to count stored cards:", err));
    return () => {
      cancelled = true;
    };
  }, [collectionGuid, scanIds, enabled]);

  return enabled ? storedCount : 0;
}
