import { useEffect, useState } from "react";
import { piHostCameraPath, piHostCameraReconnectDelayMs } from "@magic-vault/shared";
import { getRequestAuth } from "@/lib/api/client";
import { API_BASE } from "@/lib/constants/config";
import type { RaspberryPiCamera } from "@/lib/interfaces/raspberry-pis";

async function raspberryPiCameraUrl(hostGuid: string): Promise<string | null> {
  const { token, orgId } = await getRequestAuth();
  if (!token || !orgId) return null;
  const params = new URLSearchParams({ token, orgId });
  return `${API_BASE.replace(/^http/, "ws")}/api${piHostCameraPath(hostGuid)}?${params.toString()}`;
}

export function useRaspberryPiCamera(hostGuid: string, isWatching: boolean): RaspberryPiCamera {
  const [camera, setCamera] = useState<RaspberryPiCamera>({ frame: null, isUnavailable: false });

  useEffect(() => {
    if (!isWatching) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let failedConnects = 0;
    const connect = async () => {
      const url = await raspberryPiCameraUrl(hostGuid);
      if (cancelled) return;
      if (!url) {
        setCamera({ frame: null, isUnavailable: true });
        return;
      }
      const next = new WebSocket(url);
      socket = next;
      let opened = false;
      next.onopen = () => {
        opened = true;
        failedConnects = 0;
      };
      next.onmessage = (event) => {
        if (typeof event.data === "string")
          setCamera({ frame: `data:image/jpeg;base64,${event.data}`, isUnavailable: false });
      };
      next.onclose = (event) => {
        if (cancelled || socket !== next) return;
        if (!opened) failedConnects += 1;
        const delay = piHostCameraReconnectDelayMs(event.code ?? 0, failedConnects);
        if (delay === null) {
          setCamera({ frame: null, isUnavailable: true });
          return;
        }
        reconnectTimer = setTimeout(() => void connect(), delay);
      };
    };
    void connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socket?.close();
      setCamera({ frame: null, isUnavailable: false });
    };
  }, [hostGuid, isWatching]);

  return camera;
}
