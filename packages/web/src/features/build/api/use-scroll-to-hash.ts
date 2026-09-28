import {
  BUILD_ANCHOR_HIGHLIGHT_CLASSES,
  BUILD_ANCHOR_HIGHLIGHT_MS,
  BUILD_ANCHOR_SCROLL_MAX_FRAMES,
} from "@/lib/constants/build";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;

    let frame = 0;
    let attempts = 0;
    let highlighted: HTMLElement | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (!el) {
        if (attempts++ < BUILD_ANCHOR_SCROLL_MAX_FRAMES) {
          frame = requestAnimationFrame(tryScroll);
        }
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      highlighted = el;
      el.classList.add(...BUILD_ANCHOR_HIGHLIGHT_CLASSES);
      timeout = setTimeout(() => {
        el.classList.remove(...BUILD_ANCHOR_HIGHLIGHT_CLASSES);
      }, BUILD_ANCHOR_HIGHLIGHT_MS);
    };

    frame = requestAnimationFrame(tryScroll);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      highlighted?.classList.remove(...BUILD_ANCHOR_HIGHLIGHT_CLASSES);
    };
  }, [hash]);
}
