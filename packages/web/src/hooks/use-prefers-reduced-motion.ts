import { REDUCED_MOTION_MEDIA_QUERY } from "@/lib/constants/ui";
import { useSyncExternalStore } from "react";

function reducedMotionQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
}

function subscribe(listener: () => void) {
  const query = reducedMotionQuery();
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}

function readPrefersReducedMotion(): boolean {
  return reducedMotionQuery()?.matches ?? false;
}

function readServerPrefersReducedMotion(): boolean {
  return true;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    readPrefersReducedMotion,
    readServerPrefersReducedMotion,
  );
}
