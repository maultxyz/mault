import { useEffect, useState } from "react";

export function useElementWidth(element: HTMLElement | null): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setWidth(element.offsetWidth);
    });
    observer.observe(element);
    setWidth(element.offsetWidth);
    return () => observer.disconnect();
  }, [element]);

  return width;
}
