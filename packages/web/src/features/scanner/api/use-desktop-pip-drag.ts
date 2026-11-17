import { DESKTOP_PIP_DRAG_THRESHOLD_PX } from "@/lib/constants/scanner";
import type { DesktopPipDragState } from "@/lib/interfaces/scanner";
import { useRef, type MouseEvent, type PointerEvent } from "react";

export function useDesktopPipDrag() {
  const drag = useRef<DesktopPipDragState | null>(null);
  const suppressClick = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      lastX: event.screenX,
      lastY: event.screenY,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.moved) {
      const distance = Math.hypot(event.screenX - state.startX, event.screenY - state.startY);
      if (distance < DESKTOP_PIP_DRAG_THRESHOLD_PX) return;
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const x = event.screenX - state.lastX;
    const y = event.screenY - state.lastY;
    state.lastX = event.screenX;
    state.lastY = event.screenY;
    if (x || y) window.maultDesktop?.movePipWindowBy({ x, y });
  };

  const onPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    suppressClick.current = state.moved;
  };

  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onClickCapture,
  };
}
