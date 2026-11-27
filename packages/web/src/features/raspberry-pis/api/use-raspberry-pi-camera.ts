import { toWebSocketUrl } from "@/features/scanner/lib/sorter-link";
import { getRequestAuth } from "@/lib/api/client";
import type { RaspberryPiCamera } from "@/lib/interfaces/raspberry-pis";
import { piHostCameraPath, piHostCameraReconnectDelayMs } from "@magic-vault/shared";
import { useEffect, useState } from "react";

async function raspberryPiCameraUrl(hostGuid: string): Promise<string | null> {
  const { token, orgId } = await getRequestAuth();
  if (!token || !orgId) return null;
  const url = toWebSocketUrl(piHostCameraPath(hostGuid));
  url.searchParams.set("token", token);
  url.searchParams.set("orgId", orgId);
  return url.toString();
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
      next.addEventListener("open", () => {
        opened = true;
        failedConnects = 0;
      });
      next.addEventListener("message", (event) => {
        if (typeof event.data === "string")
          setCamera({ frame: `data:image/jpeg;base64,${event.data}`, isUnavailable: false });
      });
      next.addEventListener("close", (event) => {
        if (cancelled || socket !== next) return;
        if (!opened) failedConnects += 1;
        const delay = piHostCameraReconnectDelayMs(event.code, failedConnects);
        if (delay === null) {
          setCamera({ frame: null, isUnavailable: true });
          return;
        }
        reconnectTimer = setTimeout(() => void connect(), delay);
      });
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
