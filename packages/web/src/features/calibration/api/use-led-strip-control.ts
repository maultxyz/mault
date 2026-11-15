import { useSerial } from "@/features/scanner/api/use-serial";
import {
  LED_STRIP_OFF_COLOR,
  LED_STRIP_RESPONSE_TIMEOUT_MS,
} from "@/lib/constants/calibration";
import type {
  LedStripChannel,
  LedStripColor,
  LedStripCommandStatus,
  LedStripControls,
} from "@/lib/interfaces/calibration";
import {
  LED_STRIP_BOARDS,
  SERIAL_LED_UNSUPPORTED_ERROR,
  SERIAL_UNKNOWN_COMMAND_ERROR,
  parseSerialReply,
} from "@magic-vault/shared";
import { useCallback, useRef, useState } from "react";

export function useLedStripControl(): LedStripControls {
  const { isReady, board, sendRequest } = useSerial();
  const isSupportedBoard = !!board && LED_STRIP_BOARDS.includes(board);
  const [color, setColorState] = useState<LedStripColor>(LED_STRIP_OFF_COLOR);
  const [status, setStatus] = useState<LedStripCommandStatus>("idle");
  const colorRef = useRef<LedStripColor>(LED_STRIP_OFF_COLOR);
  const isSendingRef = useRef(false);
  const pendingColorRef = useRef<LedStripColor | null>(null);

  const sendLatestColor = useCallback(async () => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    try {
      while (pendingColorRef.current) {
        const colorToSend = pendingColorRef.current;
        pendingColorRef.current = null;
        const { line } = await sendRequest(
          {
            led: {
              r: colorToSend.red,
              g: colorToSend.green,
              b: colorToSend.blue,
              w: colorToSend.white,
            },
          },
          LED_STRIP_RESPONSE_TIMEOUT_MS,
        );
        const reply = parseSerialReply(line);
        if (
          reply?.error === SERIAL_UNKNOWN_COMMAND_ERROR ||
          reply?.error === SERIAL_LED_UNSUPPORTED_ERROR
        ) {
          setStatus("unsupported");
        } else if (reply?.status === "ok") {
          setStatus("idle");
        } else {
          setStatus("failed");
        }
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [sendRequest]);

  const setColor = useCallback(
    (nextColor: LedStripColor) => {
      colorRef.current = nextColor;
      setColorState(nextColor);
      if (!isReady) return;
      pendingColorRef.current = nextColor;
      void sendLatestColor();
    },
    [isReady, sendLatestColor],
  );

  const setChannel = useCallback(
    (channel: LedStripChannel, value: number) =>
      setColor({ ...colorRef.current, [channel]: value }),
    [setColor],
  );

  return { color, status, isReady, isSupportedBoard, setChannel, setColor };
}
