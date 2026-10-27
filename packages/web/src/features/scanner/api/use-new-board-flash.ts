import { ESP32_FIRMWARE_URL } from "@/lib/constants/links";
import type { FlashEsp32Result } from "@/lib/interfaces/scanner";
import { useCallback, useState } from "react";

export function useNewBoardFlash() {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<number | null>(null);
  const [flashLog, setFlashLog] = useState<string[]>([]);
  const isSupported = typeof navigator !== "undefined" && !!navigator.serial;

  const flashNewBoard = useCallback(async (): Promise<FlashEsp32Result | null> => {
    if (!navigator.serial) return null;
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      return null;
    }

    setIsFlashing(true);
    setFlashProgress(0);
    setFlashLog([]);
    try {
      const { flashEsp32Port } = await import(
        "@/features/scanner/lib/esp32-flasher"
      );
      return await flashEsp32Port(port, ESP32_FIRMWARE_URL, {
        onLog: (line) => setFlashLog((prev) => [...prev, line]),
        onClearLog: () => setFlashLog([]),
        onProgress: setFlashProgress,
      });
    } finally {
      setIsFlashing(false);
      setFlashProgress(null);
    }
  }, []);

  return { isSupported, isFlashing, flashProgress, flashLog, flashNewBoard };
}
