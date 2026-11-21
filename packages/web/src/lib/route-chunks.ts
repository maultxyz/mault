import { ROUTE_LOADING_INDICATOR_DELAY_MS } from "@/lib/constants/timing";
import type { RouteComponentModule } from "@/lib/interfaces/route-chunks";
import { lazy, useSyncExternalStore, type ComponentType } from "react";

const indicatorListeners = new Set<() => void>();
let pendingRouteLoadCount = 0;
let isRouteLoadingIndicatorVisible = false;
let indicatorDelayHandle: ReturnType<typeof setTimeout> | null = null;

function setRouteLoadingIndicatorVisible(isVisible: boolean) {
  if (isRouteLoadingIndicatorVisible === isVisible) return;
  isRouteLoadingIndicatorVisible = isVisible;
  indicatorListeners.forEach((listener) => listener());
}

function beginRouteLoad() {
  pendingRouteLoadCount += 1;
  if (pendingRouteLoadCount !== 1) return;
  indicatorDelayHandle = setTimeout(
    () => setRouteLoadingIndicatorVisible(true),
    ROUTE_LOADING_INDICATOR_DELAY_MS,
  );
}

function endRouteLoad() {
  pendingRouteLoadCount = Math.max(0, pendingRouteLoadCount - 1);
  if (pendingRouteLoadCount > 0) return;
  if (indicatorDelayHandle) clearTimeout(indicatorDelayHandle);
  indicatorDelayHandle = null;
  setRouteLoadingIndicatorVisible(false);
}

export function lazyRoute<RouteComponent extends ComponentType<object>>(
  loadRouteModule: () => Promise<RouteComponentModule<RouteComponent>>,
) {
  const routeComponent = lazy<RouteComponent>(() => {
    beginRouteLoad();
    return loadRouteModule().finally(endRouteLoad);
  });
  return routeComponent;
}

function subscribeToRouteLoadingIndicator(listener: () => void) {
  indicatorListeners.add(listener);
  return () => {
    indicatorListeners.delete(listener);
  };
}

export function useIsRouteLoadingIndicatorVisible(): boolean {
  return useSyncExternalStore(
    subscribeToRouteLoadingIndicator,
    () => isRouteLoadingIndicatorVisible,
    () => false,
  );
}
