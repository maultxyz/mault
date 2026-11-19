import { AppLoadingScreen } from "@/components/app-loading-screen";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { widgetSummaryQueryOptions } from "@/features/home/api/widget-summary";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { HOME_PATH } from "@/lib/constants/nav";
import { SECONDARY_REQUESTS_FALLBACK_DELAY_MS } from "@/lib/constants/timing";
import { InitialLoadContext } from "@/lib/initial-load-context";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function InitialLoadProvider({ children }: { children: ReactNode }) {
  const completedRef = useRef(false);
  const { pathname } = useLocation();
  const isOnHome = pathname === HOME_PATH;
  const [haveSecondaryRequestsStarted, setHaveSecondaryRequestsStarted] =
    useState(!isOnHome);
  const enableSecondaryRequests = useCallback(
    () => setHaveSecondaryRequestsStarted(true),
    [],
  );

  useEffect(() => {
    if (!isOnHome) setHaveSecondaryRequestsStarted(true);
  }, [isOnHome]);

  const initialLoadState = useMemo(
    () => ({
      completedRef,
      areSecondaryRequestsEnabled: haveSecondaryRequestsStarted || !isOnHome,
      enableSecondaryRequests,
    }),
    [haveSecondaryRequestsStarted, isOnHome, enableSecondaryRequests],
  );

  return (
    <InitialLoadContext value={initialLoadState}>{children}</InitialLoadContext>
  );
}

export function AppLoadingGate({ children }: { children: ReactNode }) {
  const initialLoad = useContext(InitialLoadContext);
  const completedRef = initialLoad?.completedRef;
  const enableSecondaryRequests = initialLoad?.enableSecondaryRequests;
  const { isLoading: orgLoading, activeOrg } = useOrg();
  const { isLoading: collectionsLoading } = useCollections();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();
  const isLandingOnHome = pathname === HOME_PATH;
  const [didLandOnHome] = useState(isLandingOnHome);
  const waitsForCollections =
    !!activeOrg && collectionsLoading && !didLandOnHome;
  const isInitialLoading = orgLoading || waitsForCollections;
  const activeOrgId = activeOrg?.id;

  useEffect(() => {
    if (completedRef?.current || !activeOrgId || !isLandingOnHome) return;
    const fallbackTimer = setTimeout(
      () => enableSecondaryRequests?.(),
      SECONDARY_REQUESTS_FALLBACK_DELAY_MS,
    );
    void Promise.allSettled([
      queryClient.prefetchQuery(orgOverviewQueryOptions(activeOrgId)),
      queryClient.prefetchQuery(widgetSummaryQueryOptions(activeOrgId)),
      queryClient.prefetchQuery(pendingTradeOffersQueryOptions(activeOrgId)),
    ]).then(() => enableSecondaryRequests?.());
    return () => clearTimeout(fallbackTimer);
  }, [
    completedRef,
    activeOrgId,
    isLandingOnHome,
    queryClient,
    enableSecondaryRequests,
  ]);

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
    if (!isInitialLoading && phase === "loading") setPhase("exiting");
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
            "fixed inset-0 z-loading-gate transition-opacity duration-150 ease-out",
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
