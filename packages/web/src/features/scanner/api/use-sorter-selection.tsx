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
  type Dispatch,
  type ReactNode,
  type SetStateAction,
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
  const [resumableKeys, setResumableKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const controlsRef = useRef(new Map<string, SorterControl>());

  const setKeyMembership = useCallback(
    (
      update: Dispatch<SetStateAction<ReadonlySet<string>>>,
      key: string,
      isMember: boolean,
    ) =>
      update((prev) => {
        if (prev.has(key) === isMember) return prev;
        const next = new Set(prev);
        if (isMember) next.add(key);
        else next.delete(key);
        return next;
      }),
    [],
  );

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
    (key: string, control: SorterControl) => {
      controlsRef.current.set(key, control);
      setKeyMembership(setRunningKeys, key, control.isRunning);
      setKeyMembership(setResumableKeys, key, control.canResume);
      return () => {
        if (controlsRef.current.get(key) === control) {
          controlsRef.current.delete(key);
        }
        setKeyMembership(setRunningKeys, key, false);
        setKeyMembership(setResumableKeys, key, false);
      };
    },
    [setKeyMembership],
  );

  const pauseSorters = useCallback((keys: Iterable<string>) => {
    for (const key of keys) controlsRef.current.get(key)?.pause();
  }, []);

  const resumeSorters = useCallback((keys: Iterable<string>) => {
    for (const key of keys) {
      const control = controlsRef.current.get(key);
      if (control?.canResume) control.resume();
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedKeys,
      runningKeys,
      resumableKeys,
      toggleSelected,
      setSelected,
      clearSelected,
      registerSorterControl,
      pauseSorters,
      resumeSorters,
    }),
    [
      selectedKeys,
      runningKeys,
      resumableKeys,
      toggleSelected,
      setSelected,
      clearSelected,
      registerSorterControl,
      pauseSorters,
      resumeSorters,
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
