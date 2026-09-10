import type { PhoneLocalCameraStatus } from "@/lib/interfaces/scanner";
import { useCallback, useEffect, useRef, useState } from "react";

export type { PhoneLocalCameraStatus };

// Phone side of "use a phone as a webcam": just acquires and holds the
// back camera. Whether/when it's actually used comes from
// use-phone-camera-responder.ts, which reads frames off the canvas this
// stream feeds (see use-video-canvas-preview.ts) and answers capture
// requests - this hook only owns the camera hardware lifecycle.
export function usePhoneLocalCamera() {
  const [status, setStatus] = useState<PhoneLocalCameraStatus>("requesting-camera");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);

  const requestCamera = useCallback(async () => {
    setErrorMessage("");
    setStatus("requesting-camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (cancelledRef.current) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setStatus("ready");
    } catch (err) {
      if (cancelledRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("camera-error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) track.stop();
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    void requestCamera();
  }, [requestCamera]);

  useEffect(() => {
    cancelledRef.current = false;
    void requestCamera();

    return () => {
      cancelledRef.current = true;
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) track.stop();
        localStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, localStream, errorMessage, disconnect, reconnect };
}
