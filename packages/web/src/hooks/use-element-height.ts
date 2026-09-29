import { useEffect, useState } from "react";

export function useElementHeight(element: HTMLElement | null): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setHeight(element.offsetHeight);
    });
    observer.observe(element);
    setHeight(element.offsetHeight);
    return () => observer.disconnect();
  }, [element]);

  return height;
}
