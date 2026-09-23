import {
  binHeightsQueryOptions,
  saveBinHeight,
} from "@/features/calibration/api/bin-heights";
import { useDevice } from "@/features/calibration/api/use-device";
import type { BinHeightsContextValue } from "@/lib/interfaces/calibration";
import type { BinHeight } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const BinHeightsContext = createContext<BinHeightsContextValue | null>(null);

export function BinHeightsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const device = useDevice();
  const [isSaving, setIsSaving] = useState(false);
  const [pending, setPending] = useState<Record<number, number>>({});

  const queryOpts = binHeightsQueryOptions(device?.guid);
  const { data: savedHeights = [] } = useQuery(queryOpts);

  const heights = useMemo((): BinHeight[] => {
    const merged = new Map(savedHeights.map((h) => [h.binNumber, h.height]));
    for (const [binNumber, height] of Object.entries(pending)) {
      merged.set(Number(binNumber), height);
    }
    return Array.from(merged, ([binNumber, height]) => ({ binNumber, height }));
  }, [savedHeights, pending]);

  const isDirty = Object.keys(pending).length > 0;

  const setHeight = useCallback((binNumber: number, height: number) => {
    setPending((prev) => ({ ...prev, [binNumber]: height }));
  }, []);

  const discard = useCallback(() => setPending({}), []);

  const commit = useCallback(async () => {
    if (!device) return;
    setIsSaving(true);
    try {
      let result;
      for (const [binNumber, height] of Object.entries(pending)) {
        result = await saveBinHeight(device.guid, Number(binNumber), height);
        if (!result.success) throw new Error(result.message);
      }
      if (result?.data) {
        queryClient.setQueryData(queryOpts.queryKey, result.data);
      }
      setPending({});
    } finally {
      setIsSaving(false);
    }
  }, [device, pending, queryClient, queryOpts.queryKey]);

  return (
    <BinHeightsContext value={{ heights, isDirty, isSaving, setHeight, commit, discard }}>
      {children}
    </BinHeightsContext>
  );
}

export function useBinHeights() {
  const context = useContext(BinHeightsContext);
  if (!context) {
    throw new Error("useBinHeights must be used within a BinHeightsProvider");
  }
  return context;
}
