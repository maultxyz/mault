import type { ScannerIslandState } from "@/lib/interfaces/scanner";
import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

export type { ScannerIslandState };

type ContextValue = {
  state: ScannerIslandState | null;
  setState: (s: ScannerIslandState | null) => void;
};

const ScannerIslandContext = createContext<ContextValue | null>(null);

export function ScannerIslandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ScannerIslandState | null>(null);
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <ScannerIslandContext.Provider value={value}>
      {children}
    </ScannerIslandContext.Provider>
  );
}

export function useScannerIsland(): ScannerIslandState | null {
  return useContext(ScannerIslandContext)?.state ?? null;
}

export function useRegisterScannerIsland(): (
  s: ScannerIslandState | null,
) => void {
  const ctx = useContext(ScannerIslandContext);
  return ctx?.setState ?? (() => {});
}
