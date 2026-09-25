import { BUILD_USING_KIT_STORAGE_KEY } from "@/lib/constants/storage-keys";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface KitModeContextValue {
  usingKit: boolean;
  setUsingKit: (value: boolean) => void;
}

const KitModeContext = createContext<KitModeContextValue | null>(null);

export function KitModeProvider({ children }: { children: ReactNode }) {
  const [usingKit, setUsingKitState] = useState(false);

  useEffect(() => {
    try {
      setUsingKitState(
        localStorage.getItem(BUILD_USING_KIT_STORAGE_KEY) === "true",
      );
    } catch {}
  }, []);

  const setUsingKit = (value: boolean) => {
    setUsingKitState(value);
    try {
      localStorage.setItem(BUILD_USING_KIT_STORAGE_KEY, String(value));
    } catch {}
  };

  return (
    <KitModeContext value={{ usingKit, setUsingKit }}>
      {children}
    </KitModeContext>
  );
}

export function useKitMode() {
  const context = useContext(KitModeContext);
  if (!context) {
    throw new Error("useKitMode must be used within a KitModeProvider");
  }
  return context;
}
