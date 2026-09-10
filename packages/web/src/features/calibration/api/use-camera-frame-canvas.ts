import { fitFrameToContainer } from "@/features/calibration/lib/scan-region-geometry";
import { useEffect, useRef, useState } from "react";

interface Size {
  width: number;
  height: number;
}

// Draws either the live webcam stream (rotated 90°, via a requestAnimationFrame
// loop) or a captured phone photo into the shared canvas/frame pair the scan
// region box overlays. Only one of `stream`/`phonePhotoUrl` is expected to be
// active at a time (see cameraSource in ScanRegionCalibrationPanel).
export function useCameraFrameCanvas({
  stream,
  phonePhotoUrl,
}: {
  stream: MediaStream | null;
  phonePhotoUrl: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const [videoSize, setVideoSize] = useState<Size | null>(null);
  const [phonePhotoSize, setPhonePhotoSize] = useState<Size | null>(null);

  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;

    (async () => {
      try {
        await video.play();
        if (cancelled) return;

        const { videoWidth, videoHeight } = video;
        setVideoSize({ width: videoWidth, height: videoHeight });

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = videoHeight;
          canvas.height = videoWidth;
        }

        const frame = frameRef.current;
        const container = frame?.parentElement;
        if (container && frame && canvas) {
          fitFrameToContainer(frame, container, canvas.width, canvas.height);
        }

        const loop = () => {
          const c = canvasRef.current;
          const ctx = c?.getContext("2d");
          if (c && ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
            ctx.save();
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(
              video,
              -videoWidth / 2,
              -videoHeight / 2,
              videoWidth,
              videoHeight,
            );
            ctx.restore();
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {}
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (!phonePhotoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      setPhonePhotoSize({ width: img.naturalWidth, height: img.naturalHeight });

      const frame = frameRef.current;
      const container = frame?.parentElement;
      if (container && frame) {
        fitFrameToContainer(frame, container, canvas.width, canvas.height);
      }
    };
    img.src = phonePhotoUrl;

    return () => {
      cancelled = true;
    };
  }, [phonePhotoUrl]);

  return { videoRef, frameRef, canvasRef, videoSize, phonePhotoSize };
}
