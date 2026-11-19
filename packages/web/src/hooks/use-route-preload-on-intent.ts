import { preloadRouteChunks } from "@/lib/route-chunks";
import { useEffect } from "react";

export function useRoutePreloadOnIntent() {
  useEffect(() => {
    const preloadedPathnames = new Set<string>();
    const preloadLinkTarget = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.origin !== window.location.origin) return;
      if (link.target && link.target !== "_self") return;
      if (preloadedPathnames.has(link.pathname)) return;
      preloadedPathnames.add(link.pathname);
      preloadRouteChunks(link.pathname);
    };
    document.addEventListener("pointerover", preloadLinkTarget, {
      passive: true,
    });
    document.addEventListener("touchstart", preloadLinkTarget, {
      passive: true,
    });
    document.addEventListener("focusin", preloadLinkTarget);
    return () => {
      document.removeEventListener("pointerover", preloadLinkTarget);
      document.removeEventListener("touchstart", preloadLinkTarget);
      document.removeEventListener("focusin", preloadLinkTarget);
    };
  }, []);
}
