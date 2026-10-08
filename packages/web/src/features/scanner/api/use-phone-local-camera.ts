import {
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  PHONE_CAMERA_DEVICE_STORAGE_KEY,
} from "@/lib/constants/scanner";
import type { PhoneLocalCameraStatus } from "@/lib/interfaces/scanner";
import { useCallback, useEffect, useRef, useState } from "react";

function readStoredDeviceId(): string | null {
  try {
    return localStorage.getItem(PHONE_CAMERA_DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredDeviceId(deviceId: string | null) {
  try {
    if (deviceId) localStorage.setItem(PHONE_CAMERA_DEVICE_STORAGE_KEY, deviceId);
    else localStorage.removeItem(PHONE_CAMERA_DEVICE_STORAGE_KEY);
  } catch {}
}

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

function openCamera(deviceId: string | null): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" }),
      width: { ideal: CAMERA_IDEAL_WIDTH },
      height: { ideal: CAMERA_IDEAL_HEIGHT },
    },
  });
}

async function listVideoInputs(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput" && d.deviceId);
  } catch {
    return [];
  }
}

export function usePhoneLocalCamera() {
  const [status, setStatus] = useState<PhoneLocalCameraStatus>("requesting-camera");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const requestIdRef = useRef(0);

  const requestCamera = useCallback(async (deviceId: string | null) => {
    const requestId = ++requestIdRef.current;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setErrorMessage("");
    setStatus("requesting-camera");
    try {
      let stream: MediaStream;
      try {
        stream = await openCamera(deviceId);
      } catch (err) {
        if (!deviceId) throw err;
        writeStoredDeviceId(null);
        stream = await openCamera(null);
      }
      if (cancelledRef.current || requestId !== requestIdRef.current) {
        stopStream(stream);
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setActiveDeviceId(
        stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId,
      );
      setStatus("ready");
      const inputs = await listVideoInputs();
      if (!cancelledRef.current && requestId === requestIdRef.current) {
        setCameras(inputs);
      }
    } catch (err) {
      if (cancelledRef.current || requestId !== requestIdRef.current) return;
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setStatus("camera-error");
    }
  }, []);

  const switchCamera = useCallback(
    (deviceId: string) => {
      writeStoredDeviceId(deviceId);
      void requestCamera(deviceId);
    },
    [requestCamera],
  );

  const disconnect = useCallback(() => {
    requestIdRef.current++;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    void requestCamera(readStoredDeviceId());
  }, [requestCamera]);

  useEffect(() => {
    cancelledRef.current = false;
    void requestCamera(readStoredDeviceId());

    return () => {
      cancelledRef.current = true;
      stopStream(localStreamRef.current);
      localStreamRef.current = null;
    };
  }, [requestCamera]);

  return {
    status,
    localStream,
    errorMessage,
    cameras,
    activeDeviceId,
    switchCamera,
    disconnect,
    reconnect,
  };
}
