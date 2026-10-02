import {
  drawDetectionOverlay,
  getDefaultCardContour,
} from "@/features/scanner/lib/card-detection";
import {
  fitCanvasesToContainer,
  observeContainerResize,
} from "@/features/scanner/lib/canvas-fit";
import type { ScanRegion } from "@magic-vault/shared";
import { useEffect, useRef } from "react";

// Standalone version of use-card-scanner.ts's stream-attach + overlay logic:
// no capture or identification, just showing where the scan region is so a
// camera can be aimed. Always drawn unrotated - unlike the desktop's
// sideways-mounted webcam, a phone's own camera already reports right-side up.
export function useVideoCanvasPreview(
  stream: MediaStream | null,
  scanRegion: ScanRegion,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const scanRegionRef = useRef(scanRegion);
  scanRegionRef.current = scanRegion;

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    let stopObservingResize: () => void = () => {};
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;

    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !canvas.width || !canvas.height) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawDetectionOverlay(ctx, {
        detected: true,
        contour: getDefaultCardContour(
          canvas.width,
          canvas.height,
          scanRegionRef.current,
        ),
        confidence: 1,
      });
    };

    const detectionLoop = () => {
      const displayCanvas = displayCanvasRef.current;
      const displayCtx = displayCanvas?.getContext("2d");
      if (
        displayCanvas &&
        displayCtx &&
        video.readyState >= video.HAVE_ENOUGH_DATA
      ) {
        displayCtx.drawImage(video, 0, 0);
      }
      rafRef.current = requestAnimationFrame(detectionLoop);
    };

    (async () => {
      try {
        await video.play();
        if (cancelled) return;

        const { videoWidth, videoHeight } = video;
        for (const ref of [displayCanvasRef, overlayCanvasRef]) {
          if (ref.current) {
            ref.current.width = videoWidth;
            ref.current.height = videoHeight;
          }
        }

        const fit = () =>
          fitCanvasesToContainer(
            [displayCanvasRef.current, overlayCanvasRef.current],
            videoWidth,
            videoHeight,
            false,
          );
        fit();
        stopObservingResize = observeContainerResize(
          displayCanvasRef.current,
          fit,
        );

        drawOverlay();
        rafRef.current = requestAnimationFrame(detectionLoop);
      } catch {}
    })();

    return () => {
      cancelled = true;
      stopObservingResize();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      video.srcObject = null;
    };
  }, [stream]);

  // Redraw the box if the calibrated region changes while streaming.
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !canvas.width || !canvas.height) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawDetectionOverlay(ctx, {
      detected: true,
      contour: getDefaultCardContour(canvas.width, canvas.height, scanRegion),
      confidence: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanRegion.coverage, scanRegion.offsetX, scanRegion.offsetY]);

  return { videoRef, displayCanvasRef, overlayCanvasRef };
}
