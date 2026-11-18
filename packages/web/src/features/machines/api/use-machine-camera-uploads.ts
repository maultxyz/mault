import { uploadMachineCameraFrame } from "@/features/machines/api/machines";
import { useAppStreamSource } from "@/lib/app-stream";
import {
  MACHINE_CAMERA_FRAME_INTERVAL_MS,
  MACHINE_CAMERA_FRAME_JPEG_QUALITY,
  MACHINE_CAMERA_FRAME_MAX_WIDTH,
  MACHINE_CAMERA_REQUESTED_EVENT,
} from "@magic-vault/shared";
import { useEffect, useRef } from "react";

async function captureVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): Promise<Blob | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return null;
  const scale = Math.min(1, MACHINE_CAMERA_FRAME_MAX_WIDTH / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", MACHINE_CAMERA_FRAME_JPEG_QUALITY),
  );
}

export function useMachineCameraUploads(machineId: string, stream: MediaStream | null) {
  const eventSource = useAppStreamSource();
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (!eventSource || !stream) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    const canvas = document.createElement("canvas");
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const uploadUntilNobodyWatches = async () => {
      if (cancelled) return;
      const frame = await captureVideoFrame(video, canvas).catch(() => null);
      const result = frame
        ? await uploadMachineCameraFrame(machineId, frame).catch(() => ({ keepSending: false }))
        : { keepSending: true };
      if (cancelled || !result.keepSending) {
        uploadingRef.current = false;
        return;
      }
      timer = setTimeout(() => void uploadUntilNobodyWatches(), MACHINE_CAMERA_FRAME_INTERVAL_MS);
    };

    const handleCameraRequested = (event: Event) => {
      const request = JSON.parse((event as MessageEvent).data) as { machineId: string };
      if (request.machineId !== machineId || uploadingRef.current) return;
      uploadingRef.current = true;
      void video.play().catch(() => undefined);
      void uploadUntilNobodyWatches();
    };

    eventSource.addEventListener(MACHINE_CAMERA_REQUESTED_EVENT, handleCameraRequested);
    return () => {
      cancelled = true;
      uploadingRef.current = false;
      if (timer) clearTimeout(timer);
      eventSource.removeEventListener(MACHINE_CAMERA_REQUESTED_EVENT, handleCameraRequested);
      video.srcObject = null;
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [eventSource, machineId, stream]);
}
