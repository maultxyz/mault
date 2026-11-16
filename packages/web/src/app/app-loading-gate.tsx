import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { widgetSummaryQueryOptions } from "@/features/home/api/widget-summary";
import { HOME_PATH } from "@/lib/constants/nav";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
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

export function InitialLoadProvider({ children }: { children: ReactNode }) {
  const completedRef = useRef(false);
  return <InitialLoadContext value={completedRef}>{children}</InitialLoadContext>;
}

export function AppLoadingGate({ children }: { children: ReactNode }) {
  const completedRef = useContext(InitialLoadContext);
  const { isLoading: orgLoading, activeOrg } = useOrg();
  const { isLoading: collectionsLoading } = useCollections();
  const isInitialLoading = orgLoading || (!!activeOrg && collectionsLoading);
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const activeOrgId = activeOrg?.id;
  const isLandingOnHome = pathname === HOME_PATH;

  useEffect(() => {
    if (completedRef?.current || !activeOrgId || !isLandingOnHome) return;
    void queryClient.prefetchQuery(orgOverviewQueryOptions(activeOrgId));
    void queryClient.prefetchQuery(widgetSummaryQueryOptions(activeOrgId));
  }, [completedRef, activeOrgId, isLandingOnHome, queryClient]);

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
        {phase === "loading" && isInitialLoading ? null : children}
      </Suspense>
      {phase !== "ready" && (
        <AppLoadingScreen
          className={cn(
            "fixed inset-0 z-loading-gate transition-opacity duration-500 ease-out",
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
