import { useEffect } from "react";

export function useScreenWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let wakeLock: WakeLockSentinel | null = null;
    let isUnmounted = false;
    const requestWakeLock = () => {
      if (document.visibilityState !== "visible") return;
      if (wakeLock && !wakeLock.released) return;
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (isUnmounted) void sentinel.release();
          else wakeLock = sentinel;
        })
        .catch(() => {});
    };
    requestWakeLock();
    document.addEventListener("visibilitychange", requestWakeLock);
    return () => {
      isUnmounted = true;
      document.removeEventListener("visibilitychange", requestWakeLock);
      void wakeLock?.release();
    };
  }, []);
}
