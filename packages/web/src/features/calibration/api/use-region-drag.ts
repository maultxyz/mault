import { clampRegion } from "@/features/calibration/lib/scan-region-geometry";
import type { CameraSource } from "@/lib/interfaces/scanner";
import type { ScanRegion } from "@magic-vault/shared";
import {
  useRef,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type SetStateAction,
} from "react";

type DragState =
  | {
      type: "move";
      startClientX: number;
      startClientY: number;
      startOffsetX: number;
      startOffsetY: number;
    }
  | {
      type: "resize";
      centerClientX: number;
      centerClientY: number;
      startDist: number;
      startCoverage: number;
    };

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Pointer-driven move/resize for the scan region box overlaid on the camera
// preview - dragging the box moves it, dragging its corner handle resizes
// it. Coordinates are read fresh from regionRef/box each gesture so this
// doesn't need to re-bind on every region change.
export function useRegionDrag({
  frameRef,
  regionRef,
  cameraSource,
  box,
  setDraft,
}: {
  frameRef: RefObject<HTMLDivElement | null>;
  regionRef: RefObject<ScanRegion>;
  cameraSource: CameraSource;
  box: Box | null;
  setDraft: Dispatch<SetStateAction<ScanRegion | null>>;
}) {
  const dragStateRef = useRef<DragState | null>(null);

  const handleBoxPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      type: "move",
      startClientX: e.clientX,
      startClientY: e.clientY,
      startOffsetX: regionRef.current.offsetX,
      startOffsetY: regionRef.current.offsetY,
    };
  };

  const handleResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const frame = frameRef.current;
    if (!frame || !box) return;
    const rect = frame.getBoundingClientRect();
    const centerClientX = rect.left + (box.left + box.width / 2) * rect.width;
    const centerClientY = rect.top + (box.top + box.height / 2) * rect.height;
    dragStateRef.current = {
      type: "resize",
      centerClientX,
      centerClientY,
      startDist: Math.hypot(
        e.clientX - centerClientX,
        e.clientY - centerClientY,
      ),
      startCoverage: regionRef.current.coverage,
    };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;

    if (drag.type === "move") {
      const rect = frame.getBoundingClientRect();
      const dxFrac = (e.clientX - drag.startClientX) / rect.width;
      const dyFrac = (e.clientY - drag.startClientY) / rect.height;
      const offsets =
        cameraSource === "phone"
          ? {
              offsetX: drag.startOffsetX + dxFrac,
              offsetY: drag.startOffsetY + dyFrac,
            }
          : {
              offsetX: drag.startOffsetX + dyFrac,
              offsetY: drag.startOffsetY - dxFrac,
            };
      setDraft(
        clampRegion({
          ...regionRef.current,
          ...offsets,
        }),
      );
    } else {
      const dist = Math.hypot(
        e.clientX - drag.centerClientX,
        e.clientY - drag.centerClientY,
      );
      if (drag.startDist > 0) {
        setDraft(
          clampRegion({
            ...regionRef.current,
            coverage: drag.startCoverage * (dist / drag.startDist),
          }),
        );
      }
    }
  };

  const handlePointerUp = () => {
    dragStateRef.current = null;
  };

  return {
    handleBoxPointerDown,
    handleResizePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
