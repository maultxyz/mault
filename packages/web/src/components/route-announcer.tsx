import {
  ROUTE_HEADING_SELECTOR,
  ROUTE_HEADING_WAIT_MS,
} from "@/lib/constants/a11y";
import { setPageHeading } from "@/lib/page-heading-store";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

function readRouteHeading() {
  return document.querySelector(ROUTE_HEADING_SELECTOR)?.textContent?.trim() ?? "";
}

export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [announcement, setAnnouncement] = useState("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    const announceOnNavigation = !isFirstRender.current;
    isFirstRender.current = false;
    let lastHeading = "";
    const publishHeading = () => {
      const heading = readRouteHeading();
      if (!heading || heading === lastHeading) return;
      lastHeading = heading;
      setPageHeading(heading);
      if (announceOnNavigation) setAnnouncement(heading);
    };
    setPageHeading("");
    setAnnouncement("");
    publishHeading();
    const observer = new MutationObserver(publishHeading);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const stopWaiting = window.setTimeout(
      () => observer.disconnect(),
      ROUTE_HEADING_WAIT_MS,
    );
    return () => {
      observer.disconnect();
      window.clearTimeout(stopWaiting);
    };
  }, [pathname]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {announcement}
    </div>
  );
}
