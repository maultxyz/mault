import type {
  FlatbedPlacement,
  FlatbedPlacementEditorProps,
} from "@/lib/interfaces/scanner";
import { useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";

function clampFraction(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function FlatbedPlacementEditor({
  imageUrl,
  glassWidthMm,
  glassHeightMm,
  placement,
  onPlacementChange,
}: FlatbedPlacementEditorProps) {
  const { t } = useTranslation("scanner");
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragPlacement, setDragPlacement] = useState<FlatbedPlacement | null>(null);
  const shownPlacement = dragPlacement ?? placement;

  const pointerFraction = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: clampFraction((event.clientX - bounds.left) / bounds.width),
      y: clampFraction((event.clientY - bounds.top) / bounds.height),
    };
  };

  const placementBetween = (
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): FlatbedPlacement => ({
    leftMm: Math.min(start.x, end.x) * glassWidthMm,
    topMm: Math.min(start.y, end.y) * glassHeightMm,
    widthMm: Math.abs(end.x - start.x) * glassWidthMm,
    heightMm: Math.abs(end.y - start.y) * glassHeightMm,
  });

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={t("flatbed.calibration.editorLabel")}
      className="relative mx-auto cursor-crosshair touch-none select-none overflow-hidden rounded-lg ring-1 ring-border"
      style={{
        aspectRatio: `${glassWidthMm} / ${glassHeightMm}`,
        width: `min(100%, calc((100dvh - 22rem) * ${glassWidthMm / glassHeightMm}))`,
      }}
      onPointerDown={(event) => {
        const start = pointerFraction(event);
        if (!start) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = start;
        setDragPlacement(placementBetween(start, start));
      }}
      onPointerMove={(event) => {
        const start = dragStartRef.current;
        const current = pointerFraction(event);
        if (start && current) setDragPlacement(placementBetween(start, current));
      }}
      onPointerUp={(event) => {
        const start = dragStartRef.current;
        const end = pointerFraction(event);
        dragStartRef.current = null;
        setDragPlacement(null);
        if (start && end) onPlacementChange(placementBetween(start, end));
      }}
    >
      <img
        src={imageUrl}
        alt={t("flatbed.calibration.previewAlt")}
        className="pointer-events-none absolute inset-0 size-full object-fill"
        draggable={false}
      />
      {shownPlacement && (
        <div
          className="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/10"
          style={{
            left: `${(shownPlacement.leftMm / glassWidthMm) * 100}%`,
            top: `${(shownPlacement.topMm / glassHeightMm) * 100}%`,
            width: `${(shownPlacement.widthMm / glassWidthMm) * 100}%`,
            height: `${(shownPlacement.heightMm / glassHeightMm) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
