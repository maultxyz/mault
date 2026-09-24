import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { APP_LOADING_TRANSITION_MS } from "@/lib/constants/timing";
import { cn } from "@/lib/utils";
import {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

const InitialLoadContext = createContext<RefObject<boolean> | null>(null);

// Lives above the sorter stations: switching tabs remounts the routed app
// (and this gate with it) under another station, and that must not replay
// the initial loading screen.
export function InitialLoadProvider({ children }: { children: ReactNode }) {
  const completedRef = useRef(false);
  return <InitialLoadContext value={completedRef}>{children}</InitialLoadContext>;
}

export function AppLoadingGate({ children }: { children: ReactNode }) {
  const completedRef = useContext(InitialLoadContext);
  const { isLoading: orgLoading, activeOrg } = useOrg();
  const { isLoading: collectionsLoading } = useCollections();
  const isInitialLoading = orgLoading || (!!activeOrg && collectionsLoading);

  const [phase, setPhase] = useState<"loading" | "exiting" | "ready">(() =>
    completedRef?.current ? "ready" : "loading",
  );
  const [overlayVisible, setOverlayVisible] = useState(
    () => !completedRef?.current,
  );

  useEffect(() => {
    if (phase === "ready" && completedRef) completedRef.current = true;
  }, [phase, completedRef]);

  useEffect(() => {
    if (isInitialLoading || phase !== "loading") return;
    const id = setTimeout(() => setPhase("exiting"), APP_LOADING_TRANSITION_MS);
    return () => clearTimeout(id);
  }, [isInitialLoading, phase]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const id = requestAnimationFrame(() => setOverlayVisible(false));
    return () => cancelAnimationFrame(id);
  }, [phase]);

  return (
    <>
      <Suspense fallback={null}>
        {phase === "loading" ? null : children}
      </Suspense>
      {phase !== "ready" && (
        <AppLoadingScreen
          className={cn(
            "fixed inset-0 z-9999 transition-opacity duration-500 ease-out",
            overlayVisible ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onTransitionEnd={() => {
            if (phase === "exiting") setPhase("ready");
          }}
        />
      )}
    </>
  );
}
