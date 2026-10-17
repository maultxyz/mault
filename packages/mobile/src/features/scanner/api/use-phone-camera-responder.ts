import { useEffect, useRef, useState } from "react";
import EventSource from "react-native-sse";
import type { PhoneCameraMessage, ScanRegion } from "@magic-vault/shared";
import { postPhoneCameraSignal } from "@/features/scanner/api/phone-camera";
import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import { STREAM_RECONNECT_DELAY_MS } from "@/lib/constants/monitor";
import { PHONE_CAMERA_HEARTBEAT_MS } from "@/lib/constants/phone-camera";
import type { PhoneCameraResponder, PhoneCameraResponderOptions } from "@/lib/interfaces/scanner";

export function usePhoneCameraResponder({
  collectionGuid,
  enabled,
  capture,
}: PhoneCameraResponderOptions): PhoneCameraResponder {
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [scanRegion, setScanRegion] = useState<ScanRegion | null>(null);
  const captureRef = useRef(capture);
  captureRef.current = capture;

  useEffect(() => {
    if (!enabled) return;
    let source: EventSource<string> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const send = (message: PhoneCameraMessage) => void postPhoneCameraSignal(collectionGuid, message).catch(() => {});

    const handle = async (message: PhoneCameraMessage) => {
      if (message.kind === "desktop_disconnected") {
        setSessionEnded(true);
        return;
      }
      if (message.kind === "scan_region_updated") {
        if (message.scanRegion) setScanRegion(message.scanRegion);
        return;
      }
      if (message.kind !== "capture_requested" || !message.requestId) return;
      const imageDataUrl = await captureRef.current().catch(() => null);
      if (!imageDataUrl || cancelled) return;
      send({ kind: "capture_response", requestId: message.requestId, imageDataUrl });
      setCapturedCount((count) => count + 1);
    };

    const connect = async () => {
      const { token, orgId } = await getRequestAuth();
      if (cancelled || !orgId) return;
      const params = new URLSearchParams({ orgId, guids: collectionGuid });
      if (token) params.set("token", token);
      const es = new EventSource<string>(`${API_BASE}/api/stream?${params.toString()}`, { pollingInterval: 0 });
      source = es;
      es.addEventListener(`session:${collectionGuid}:phone_camera_message`, (event) => {
        const data = (event as { data: string | null }).data;
        if (!data) return;
        try {
          void handle(JSON.parse(data) as PhoneCameraMessage);
        } catch {}
      });
      es.addEventListener("open", () => setConnected(true));
      es.addEventListener("error", () => {
        setConnected(false);
        es.close();
        if (cancelled) return;
        reconnectTimer = setTimeout(() => void connect(), STREAM_RECONNECT_DELAY_MS);
      });
    };

    void connect();
    send({ kind: "camera_ready" });
    const heartbeat = setInterval(() => send({ kind: "camera_ready" }), PHONE_CAMERA_HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.removeAllEventListeners();
      source?.close();
      send({ kind: "camera_left" });
      setConnected(false);
    };
  }, [collectionGuid, enabled]);

  return { connected, sessionEnded, capturedCount, scanRegion };
}
