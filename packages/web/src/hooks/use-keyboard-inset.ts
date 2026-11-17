import { useEffect, useState } from "react";

export function useKeyboardInset(enabled = true): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      setInset(0);
      return;
    }
    const update = () =>
      setInset(
        Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        ),
      );
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);

  return inset;
}
