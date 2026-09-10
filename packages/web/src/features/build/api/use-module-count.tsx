import {
  DEFAULT_MODULES,
  MAX_MODULES,
  MIN_MODULES,
} from "@/lib/constants/build";
import { BUILD_MODULE_COUNT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export { DEFAULT_MODULES, MAX_MODULES, MIN_MODULES };

interface ModuleCountContextValue {
  moduleCount: number;
  setModuleCount: (value: number) => void;
}

const ModuleCountContext = createContext<ModuleCountContextValue | null>(
  null,
);

export function ModuleCountProvider({ children }: { children: ReactNode }) {
  const [moduleCount, setModuleCountState] = useState(DEFAULT_MODULES);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILD_MODULE_COUNT_STORAGE_KEY);
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (parsed >= MIN_MODULES && parsed <= MAX_MODULES) {
        setModuleCountState(parsed);
      }
    } catch {}
  }, []);

  const setModuleCount = (value: number) => {
    const clamped = Math.min(MAX_MODULES, Math.max(MIN_MODULES, value));
    setModuleCountState(clamped);
    try {
      localStorage.setItem(BUILD_MODULE_COUNT_STORAGE_KEY, String(clamped));
    } catch {}
  };

  return (
    <ModuleCountContext value={{ moduleCount, setModuleCount }}>
      {children}
    </ModuleCountContext>
  );
}

export function useModuleCount() {
  const context = useContext(ModuleCountContext);
  if (!context) {
    throw new Error(
      "useModuleCount must be used within a ModuleCountProvider",
    );
  }
  return context;
}
