import { flashEsp32Port } from "@/features/scanner/lib/esp32-flasher";
import { ESP32_FIRMWARE_URL } from "@/lib/constants/links";
import type { FlashEsp32Result } from "@/lib/interfaces/scanner";
import { useCallback, useState } from "react";

// Flashes a board picked straight from the browser's port prompt, without
// going through a sorter connection. That's what lets a blank ESP32-S3 (or
// one running someone else's sketch) get its first firmware from the app.
export function useNewBoardFlash() {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<number | null>(null);
  const [flashLog, setFlashLog] = useState<string[]>([]);
  const isSupported = typeof navigator !== "undefined" && !!navigator.serial;

  // requestPort must be the first await: the browser only shows the picker
  // from within the click that started this.
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
