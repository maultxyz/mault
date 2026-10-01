import { useSerial } from "@/features/scanner/api/use-serial";
import {
  JAM_VERIFY_INTERVAL_MS,
  JAM_VERIFY_SAMPLES,
  SCAN_POSITION_MODULE,
} from "@/lib/constants/scanner";
import { useCallback, useRef } from "react";

export function useVerifyJam() {
  const { readIR } = useSerial();
  const verifyingRef = useRef(new Set<number>());

  return useCallback(async (module: number): Promise<boolean> => {
    if (module === SCAN_POSITION_MODULE) return false;
    if (verifyingRef.current.has(module)) return false;

    verifyingRef.current.add(module);
    try {
      for (let sample = 0; sample < JAM_VERIFY_SAMPLES; sample++) {
        if (sample > 0) {
          await new Promise<void>((r) => setTimeout(r, JAM_VERIFY_INTERVAL_MS));
        }
        const ir = await readIR();
        if (ir?.[module - 1] !== true) return false;
      }
      return true;
    } finally {
      verifyingRef.current.delete(module);
    }
  }, [readIR]);
}
