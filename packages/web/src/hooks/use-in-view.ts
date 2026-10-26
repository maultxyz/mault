import { useEffect, useState, type RefObject } from "react";
import type { UseInViewOptions } from "@/lib/interfaces/in-view";

export function useInView(
  elementRef: RefObject<Element | null>,
  { observeOnlyUntilFirstVisible = false, rootMargin = "0px" }: UseInViewOptions = {},
): boolean {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.isIntersecting && observeOnlyUntilFirstVisible) {
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef, observeOnlyUntilFirstVisible, rootMargin]);

  return isInView;
}
