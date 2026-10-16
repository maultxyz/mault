import type {
  SorterControl,
  SorterSelectionContextValue,
} from "@/lib/interfaces/stations";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SorterSelectionContext =
  createContext<SorterSelectionContextValue | null>(null);

export function SorterSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [runningKeys, setRunningKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const pausersRef = useRef(new Map<string, () => void>());

  const setRunning = useCallback((key: string, running: boolean) => {
    setRunningKeys((prev) => {
      if (prev.has(key) === running) return prev;
      const next = new Set(prev);
      if (running) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const setSelected = useCallback(
    (keys: Iterable<string>) => setSelectedKeys(new Set(keys)),
    [],
  );

  const clearSelected = useCallback(() => setSelectedKeys(new Set()), []);

  const registerSorterControl = useCallback(
    (key: string, { isRunning, pause }: SorterControl) => {
      pausersRef.current.set(key, pause);
      setRunning(key, isRunning);
      return () => {
        if (pausersRef.current.get(key) === pause) {
          pausersRef.current.delete(key);
        }
        setRunning(key, false);
      };
    },
    [setRunning],
  );

  const pauseSorters = useCallback((keys: Iterable<string>) => {
    for (const key of keys) pausersRef.current.get(key)?.();
  }, []);

  const value = useMemo(
    () => ({
      selectedKeys,
      runningKeys,
      toggleSelected,
      setSelected,
      clearSelected,
      registerSorterControl,
      pauseSorters,
    }),
    [
      selectedKeys,
      runningKeys,
      toggleSelected,
      setSelected,
      clearSelected,
      registerSorterControl,
      pauseSorters,
    ],
  );

  return <SorterSelectionContext value={value}>{children}</SorterSelectionContext>;
}

export function useSorterSelection() {
  const context = useContext(SorterSelectionContext);
  if (!context) {
    throw new Error(
      "useSorterSelection must be used within a SorterSelectionProvider",
    );
  }
  return context;
}
