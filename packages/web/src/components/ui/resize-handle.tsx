import type { ResizeHandleProps } from "@/lib/interfaces/layout";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function ResizeHandle({
  orientation,
  isDragging,
  onPointerDown,
  onKeyDown,
  valueNow,
  valueMin,
  valueMax,
  className,
}: ResizeHandleProps) {
  const { t } = useTranslation("common");
  const isKeyboardOperable = onKeyDown !== undefined && valueNow !== undefined;
  return (
    <div
      role="separator"
      aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
      aria-label={t("a11y.resizePanel")}
      {...(isKeyboardOperable
        ? {
            tabIndex: 0,
            onKeyDown,
            "aria-valuenow": Math.round(valueNow),
            "aria-valuemin": valueMin,
            "aria-valuemax": valueMax,
          }
        : {})}
      onPointerDown={onPointerDown}
      className={cn(
        "shrink-0 relative z-10 touch-none select-none group outline-none focus-visible:bg-primary/20",
        orientation === "vertical" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
        className,
      )}
    >
      <div
        className={cn(
          "absolute bg-border transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary",
          isDragging && "bg-primary/60",
          orientation === "vertical"
            ? "inset-y-0 left-1/2 w-px -translate-x-1/2"
            : "inset-x-0 top-1/2 h-px -translate-y-1/2",
        )}
      />
    </div>
  );
}
