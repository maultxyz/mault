import { getAuthHeaders } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/api";
import {
  PI_CAMERA_BASE,
  PI_CAMERA_PREVIEW_INTERVAL_MS,
} from "@/lib/constants/scanner";
import { useEffect, useRef, useState } from "react";
import type { PiCameraPreviewProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { fitCanvasesToContainer, observeContainerResize } from "@/features/scanner/lib/canvas-fit";

export function PiCameraPreview({
  alt,
  className,
  rotated = false,
  flipped = false,
}: PiCameraPreviewProps) {
  const [src, setSrc] = useState<string>();
  const imageRef = useRef<HTMLImageElement>(null);
  const fit = () => {
    const image = imageRef.current;
    if (rotated && image) {
      fitCanvasesToContainer([image], image.naturalWidth, image.naturalHeight, true);
    }
  };
  useEffect(() => {
    if (!rotated) return;
    const image = imageRef.current;
    const resize = () => {
      if (image) fitCanvasesToContainer([image], image.naturalWidth, image.naturalHeight, true);
    };
    resize();
    return observeContainerResize(image, resize);
  }, [rotated]);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const pull = async () => {
      try {
        const response = await fetch(`${API_BASE}${PI_CAMERA_BASE}/frame`, {
          headers: await getAuthHeaders(),
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          setSrc(url);
        }
      } catch {}
      if (!controller.signal.aborted)
        timer = setTimeout(pull, PI_CAMERA_PREVIEW_INTERVAL_MS);
    };
    void pull();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, []);
  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      onLoad={fit}
      className={cn(
        className,
        rotated ? (flipped ? "-rotate-90" : "rotate-90") : flipped && "rotate-180",
      )}
    />
  );
}
