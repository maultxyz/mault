import { STICK_TO_BOTTOM_THRESHOLD_PX } from "@/lib/constants/scroll";
import { useCallback, useLayoutEffect, useRef } from "react";

function isNearBottom(element: HTMLElement): boolean {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <=
    STICK_TO_BOTTOM_THRESHOLD_PX
  );
}

export function useStickToBottom(contentVersion: unknown) {
  const elementRef = useRef<HTMLElement | null>(null);
  const pinnedRef = useRef(true);

  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    if (!element) return;
    pinnedRef.current = true;
    element.scrollTop = element.scrollHeight;
    const handleScroll = () => {
      pinnedRef.current = isNearBottom(element);
    };
    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element && pinnedRef.current) element.scrollTop = element.scrollHeight;
  }, [contentVersion]);

  return ref;
}
