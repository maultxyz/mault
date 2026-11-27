import { getAuthHeaders } from "@/lib/api/client";
import { piCameraUrl } from "@/features/scanner/lib/pi-camera";
import { useRaspberryPiCamera } from "@/features/raspberry-pis/api/use-raspberry-pi-camera";
import {
  PI_CAMERA_PREVIEW_INTERVAL_MS,
  PI_CAMERA_PREVIEW_TIMEOUT_MS,
} from "@/lib/constants/scanner";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
      fitCanvasesToContainer([image], image.naturalWidth, image.naturalHeight, true, "contain");
    }
  };
  useEffect(() => {
    if (!rotated) return;
    const image = imageRef.current;
    const resize = () => {
      if (image) fitCanvasesToContainer([image], image.naturalWidth, image.naturalHeight, true, "contain");
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
  const { t } = useTranslation("scanner");
  const [src, setSrc] = useState<string>();
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    let url: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const frameUrl = piCameraUrl("frame", cameraId);
    const clearFrame = () => {
      setSrc(undefined);
      if (url) URL.revokeObjectURL(url);
      url = undefined;
    };
    const loadFrame = async (signal: AbortSignal) => {
      const headers = await getAuthHeaders();
      signal.throwIfAborted();
      const response = await fetch(`${frameUrl}${frameUrl.includes("?") ? "&" : "?"}fresh=1`, {
        headers,
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Camera is unavailable");
      return response.blob();
    };
    const pull = async () => {
      const request = new AbortController();
      controller = request;
      const aborted = new Promise<never>((_, reject) => {
        request.signal.onabort = () => reject(request.signal.reason);
      });
      deadline = setTimeout(() => request.abort(), PI_CAMERA_PREVIEW_TIMEOUT_MS);
      try {
        const blob = await Promise.race([loadFrame(request.signal), aborted]);
        if (disposed || request.signal.aborted) return;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        setSrc(url);
        setUnavailable(false);
      } catch {
        if (!disposed) {
          clearFrame();
          setUnavailable(true);
        }
      } finally {
        clearTimeout(deadline);
        request.signal.onabort = null;
      }
      if (!disposed)
        timer = setTimeout(pull, PI_CAMERA_PREVIEW_INTERVAL_MS);
    };
    clearFrame();
    setUnavailable(false);
    void pull();
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
      if (url) URL.revokeObjectURL(url);
    };
  }, [cameraId]);
  return (
    <RotatedCameraImage
      src={src}
      {...imageProps}
      alt={unavailable ? t("camera.piUnavailable") : imageProps.alt}
    />
  );
}

function LinkedPiCameraPreview({ hostGuid, ...imageProps }: LinkedPiCameraPreviewProps) {
  const camera = useRaspberryPiCamera(hostGuid, true);
  return <RotatedCameraImage src={camera.frame ?? undefined} {...imageProps} />;
}
