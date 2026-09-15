import { postPhoneCameraSignal } from "@/features/collections/api/phone-camera-signal";
import { useCollectionStream } from "@/lib/app-stream";
import type { PhoneCameraMessage } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCameraSignalChannel(
  collectionGuid: string | undefined,
  onMessage: (message: PhoneCameraMessage) => void,
) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const eventSource = useCollectionStream(collectionGuid);

  useEffect(() => {
    if (!collectionGuid) return;
    setConnected(false);
  }, [collectionGuid]);

  useEffect(() => {
    if (!collectionGuid || !eventSource) return;

    const onPhoneMessage = (e: Event) => {
      const message = JSON.parse(
        (e as MessageEvent).data,
      ) as PhoneCameraMessage;
      onMessageRef.current(message);
    };
    const onOpen = () => setConnected(true);
    const onError = () => setConnected(false);

    eventSource.addEventListener(
      `session:${collectionGuid}:phone_camera_message`,
      onPhoneMessage,
    );
    eventSource.addEventListener("open", onOpen);
    eventSource.addEventListener("error", onError);

    if (eventSource.readyState === EventSource.OPEN) setConnected(true);

    return () => {
      eventSource.removeEventListener(
        `session:${collectionGuid}:phone_camera_message`,
        onPhoneMessage,
      );
      eventSource.removeEventListener("open", onOpen);
      eventSource.removeEventListener("error", onError);
      setConnected(false);
    };
  }, [eventSource, collectionGuid]);

  const send = useCallback(
    (message: PhoneCameraMessage) => {
      if (!collectionGuid) return;
      postPhoneCameraSignal(collectionGuid, message).catch(() => {});
    },
    [collectionGuid],
  );

  return { send, connected };
}
