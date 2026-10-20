import {
  SCROLL_COLLAPSE_AT,
  SCROLL_COLLAPSE_MIN_OVERFLOW,
  SCROLL_EXPAND_AT,
} from "@/lib/constants/nav";
import { useEffect, useState } from "react";

export function useScrollCollapse(element: HTMLElement | null): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!element) return;
    const onScroll = () => {
      const top = element.scrollTop;
      setCollapsed((prev) =>
        prev
          ? top > SCROLL_EXPAND_AT
          : top > SCROLL_COLLAPSE_AT &&
            element.scrollHeight - element.clientHeight >
              SCROLL_COLLAPSE_MIN_OVERFLOW,
      );
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    return () => element.removeEventListener("scroll", onScroll);
  }, [element]);

  return collapsed;
}
