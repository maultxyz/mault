import {
  clampWatchBox,
  watchBoxBetween,
} from "@/features/admin/lib/servo-motion-watch";
import {
  KIT_WATCH_BOX_ADJUSTMENTS,
  KIT_WATCH_DEFAULT_ASPECT_RATIO,
  KIT_WATCH_DEFAULT_BOX_FRACTION,
  KIT_WATCH_BOX_STEP_FRACTION,
} from "@/lib/constants/kit-test";
import type {
  KitWatchBox,
  KitWatchBoxEditorProps,
} from "@/lib/interfaces/kit-test";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useTranslation } from "react-i18next";

function clampFraction(value: number) {
  return Math.min(1, Math.max(0, value));
}

function defaultBox(): KitWatchBox {
  const size = KIT_WATCH_DEFAULT_BOX_FRACTION;
  return { x: (1 - size) / 2, y: (1 - size) / 2, width: size, height: size };
}

export function KitWatchBoxEditor({
  watchCamera,
  channels,
  activeChannel,
  disabled,
}: KitWatchBoxEditorProps) {
  const { t } = useTranslation("admin");
  const { videoRef, stream, boxes, setBox } = watchCamera;
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragBox, setDragBox] = useState<KitWatchBox | null>(null);
  const [aspectRatio, setAspectRatio] = useState(KIT_WATCH_DEFAULT_ASPECT_RATIO);
  const hintId = useId();
  const canEdit = !disabled && activeChannel !== null;

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream, videoRef]);

  const pointerFraction = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: clampFraction((event.clientX - bounds.left) / bounds.width),
      y: clampFraction((event.clientY - bounds.top) / bounds.height),
    };
  };

  const adjustBox = (
    adjustment: (typeof KIT_WATCH_BOX_ADJUSTMENTS)[number]["key"],
  ) => {
    if (!canEdit || activeChannel === null) return;
    const step = KIT_WATCH_BOX_STEP_FRACTION;
    const box = boxes[activeChannel] ?? defaultBox();
    const nextBox = {
      left: { ...box, x: box.x - step },
      right: { ...box, x: box.x + step },
      up: { ...box, y: box.y - step },
      down: { ...box, y: box.y + step },
      grow: {
        x: box.x - step / 2,
        y: box.y - step / 2,
        width: box.width + step,
        height: box.height + step,
      },
      shrink: {
        x: box.x + step / 2,
        y: box.y + step / 2,
        width: box.width - step,
        height: box.height - step,
      },
    }[adjustment];
    setBox(activeChannel, clampWatchBox(nextBox));
  };

  const adjustmentIcons = {
    left: IconArrowLeft,
    right: IconArrowRight,
    up: IconArrowUp,
    down: IconArrowDown,
    grow: IconPlus,
    shrink: IconMinus,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        role="application"
        aria-label={t("kitTest.stress.camera.editorLabel", {
          channel: activeChannel ?? "",
        })}
        aria-describedby={hintId}
        className={cn(
          "relative mx-auto w-full max-w-xl touch-none overflow-hidden rounded-lg bg-black ring-1 ring-border select-none",
          canEdit && "cursor-crosshair",
        )}
        style={{ aspectRatio }}
        onPointerDown={(event) => {
          if (!canEdit) return;
          const start = pointerFraction(event);
          if (!start) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStartRef.current = start;
          setDragBox(watchBoxBetween(start, start));
        }}
        onPointerMove={(event) => {
          const start = dragStartRef.current;
          const current = pointerFraction(event);
          if (start && current) setDragBox(watchBoxBetween(start, current));
        }}
        onPointerUp={(event) => {
          const start = dragStartRef.current;
          const end = pointerFraction(event);
          dragStartRef.current = null;
          setDragBox(null);
          if (start && end && activeChannel !== null) {
            setBox(activeChannel, watchBoxBetween(start, end));
          }
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full object-fill"
          onLoadedMetadata={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget;
            if (videoWidth && videoHeight) {
              setAspectRatio(videoWidth / videoHeight);
            }
          }}
        />
        {channels.map((channel) => {
          const box =
            channel === activeChannel && dragBox ? dragBox : boxes[channel];
          if (!box) return null;
          return (
            <div
              key={channel}
              aria-hidden
              className={cn(
                "pointer-events-none absolute rounded-sm border-2",
                channel === activeChannel
                  ? "border-primary bg-primary/15"
                  : "border-white/80",
              )}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.width * 100}%`,
                height: `${box.height * 100}%`,
              }}
            >
              <span className="absolute top-0 left-0 rounded-br-sm bg-black/70 px-1 font-mono text-2xs text-white">
                {channel}
              </span>
            </div>
          );
        })}
      </div>
      <div
        role="group"
        aria-label={t("kitTest.stress.camera.adjustLabel", {
          channel: activeChannel ?? "",
        })}
        className="flex flex-wrap justify-center gap-1.5"
      >
        {KIT_WATCH_BOX_ADJUSTMENTS.map(({ key }) => {
          const Icon = adjustmentIcons[key];
          return (
            <Button
              key={key}
              variant="outline"
              size="icon"
              disabled={!canEdit}
              aria-label={t(`kitTest.stress.camera.adjust.${key}`)}
              onClick={() => adjustBox(key)}
            >
              <Icon />
            </Button>
          );
        })}
      </div>
      <p id={hintId} className="text-xs text-foreground/70">
        {t("kitTest.stress.camera.editorHint")}
      </p>
    </div>
  );
}
