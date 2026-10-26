import { useCallback, useRef, type MouseEvent } from "react";

export function useShiftClick() {
  const shiftRef = useRef(false);

  const onMouseDown = useCallback((event: MouseEvent) => {
    shiftRef.current = event.shiftKey;
    if (event.shiftKey) event.preventDefault();
  }, []);

  const consumeShift = useCallback(() => {
    const shiftKey = shiftRef.current;
    shiftRef.current = false;
    return shiftKey;
  }, []);

  return { onMouseDown, consumeShift };
}
