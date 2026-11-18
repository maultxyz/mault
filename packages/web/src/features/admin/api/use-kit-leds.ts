import { useKitCommand } from "@/features/admin/api/use-kit-command";
import {
  applyLedUpdate,
  createDefaultLedStates,
  parseFirmwareLedStates,
} from "@/features/admin/lib/kit-led-states";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  GET_LEDS_COMMAND,
  isFirmwareFeatureSupported,
  type FirmwareLedUpdate,
} from "@magic-vault/shared";
import { useCallback, useEffect, useState } from "react";

export function useKitLeds() {
  const sendCommand = useKitCommand();
  const { isConnected, firmwareVersion } = useSerial();
  const isSupported = isFirmwareFeatureSupported(firmwareVersion, "ledStrips");
  const [ledStates, setLedStates] = useState(createDefaultLedStates);

  const loadLedStatesFromBoard = useCallback(async () => {
    const line = await sendCommand(GET_LEDS_COMMAND);
    const parsed = line ? parseFirmwareLedStates(line) : null;
    if (parsed) setLedStates(parsed);
  }, [sendCommand]);

  useEffect(() => {
    if (isConnected && isSupported) void loadLedStatesFromBoard();
  }, [isConnected, isSupported, loadLedStatesFromBoard]);

  const previewLeds = useCallback((update: FirmwareLedUpdate) => {
    setLedStates((current) => applyLedUpdate(current, update));
  }, []);

  const updateLeds = useCallback(
    async (update: FirmwareLedUpdate) => {
      setLedStates((current) => applyLedUpdate(current, update));
      if ((await sendCommand({ setLed: update })) === null) {
        await loadLedStatesFromBoard();
      }
    },
    [sendCommand, loadLedStatesFromBoard],
  );

  return {
    ledStates,
    isSupported,
    previewLeds,
    updateLeds,
    loadLedStatesFromBoard,
  };
}
