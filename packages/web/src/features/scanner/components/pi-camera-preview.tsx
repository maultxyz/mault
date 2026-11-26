import { getAuthHeaders } from "@/lib/api/client";
import { piCameraUrl } from "@/features/scanner/lib/pi-camera";
import { useRaspberryPiCamera } from "@/features/raspberry-pis/api/use-raspberry-pi-camera";
import {
  PI_CAMERA_PREVIEW_INTERVAL_MS,
} from "@/lib/constants/scanner";
import { useEffect, useRef, useState } from "react";
import type {
  LinkedPiCameraPreviewProps,
  PiCameraPreviewProps,
  RotatedCameraImageProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { fitCanvasesToContainer, observeContainerResize } from "@/features/scanner/lib/canvas-fit";

function RotatedCameraImage({
  src,
  alt,
  className,
  rotated = false,
  flipped = false,
}: RotatedCameraImageProps) {
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

export function PiCameraPreview({ linkedHostGuid, cameraId, ...imageProps }: PiCameraPreviewProps) {
  if (linkedHostGuid) return <LinkedPiCameraPreview hostGuid={linkedHostGuid} {...imageProps} />;
  return <SelfHostedPiCameraPreview cameraId={cameraId} {...imageProps} />;
}

function SelfHostedPiCameraPreview({
  cameraId,
  ...imageProps
}: Omit<PiCameraPreviewProps, "linkedHostGuid">) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const pull = async () => {
      try {
        const response = await fetch(piCameraUrl("frame", cameraId), {
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
  }, [cameraId]);
  return <RotatedCameraImage src={src} {...imageProps} />;
}

function LinkedPiCameraPreview({ hostGuid, ...imageProps }: LinkedPiCameraPreviewProps) {
  const camera = useRaspberryPiCamera(hostGuid, true);
  return <RotatedCameraImage src={camera.frame ?? undefined} {...imageProps} />;
}
