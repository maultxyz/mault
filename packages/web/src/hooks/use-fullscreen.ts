import { useCallback, useSyncExternalStore } from "react";

function subscribeToFullscreenChanges(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

function readIsFullscreen() {
  return !!document.fullscreenElement;
}

export function useFullscreen() {
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreenChanges,
    readIsFullscreen,
    () => false,
  );
  const canUseFullscreen =
    typeof document !== "undefined" && document.fullscreenEnabled;
  const toggleFullscreen = useCallback(() => {
    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    void request.catch(() => {});
  }, []);
  return { isFullscreen, canUseFullscreen, toggleFullscreen };
}
