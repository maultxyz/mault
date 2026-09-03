import { postPhoneCameraSignal } from "@/features/collections/api/phone-camera-signal";
import { createSessionEventSource } from "@/lib/api/session";
import type { PhoneCameraMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

// Thin transport shared by the desktop capture hook and the phone responder:
// relays presence/capture messages over the collection's existing session
// SSE stream. No sender/role filtering needed - each side only sends message
// kinds the other side doesn't, so echoed broadcasts are naturally ignored.
export function useCameraSignalChannel(
  collectionGuid: string | undefined,
  onMessage: (message: PhoneCameraMessage) => void,
) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!collectionGuid) return;

    let cancelled = false;
    setConnected(false);

    createSessionEventSource(collectionGuid).then((es) => {
      if (cancelled) {
        es.close();
        return;
      }
      esRef.current = es;

      es.addEventListener("phone_camera_message", (e) => {
        const message = JSON.parse((e as MessageEvent).data) as PhoneCameraMessage;
        onMessageRef.current(message);
      });

      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
    });

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [collectionGuid]);

  const send = useCallback(
    (message: PhoneCameraMessage) => {
      if (!collectionGuid) return;
      postPhoneCameraSignal(collectionGuid, message).catch(() => {});
    },
    [collectionGuid],
  );

  return { send, connected };
}
