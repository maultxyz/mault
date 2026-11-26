import { useLiveRaspberryPiList } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { useStation } from "@/features/scanner/api/use-stations";
import {
  applyPiScanState,
  switchPiScanTarget,
} from "@/features/scanner/lib/pi-scan-store";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePiHost } from "@/hooks/use-pi-host";
import { IDLE_PI_SCAN_SESSION } from "@/lib/constants/scanner";
import type { PiScanMode } from "@/lib/interfaces/scanner";
import { useEffect, useRef } from "react";

export function usePiScanMode(): PiScanMode {
  const piHost = usePiHost();
  const isMobile = useIsMobile();
  const { station } = useStation();
  const deviceGuid = station.deviceGuid;
  const looksForLinkedPi = !piHost && !isMobile && !!deviceGuid;
  const { data, refetch } = useLiveRaspberryPiList(looksForLinkedPi);
  const linkedPi = looksForLinkedPi
    ? (data?.hosts.find((host) => host.sorterDeviceGuid === deviceGuid) ?? null)
    : null;

  const refetchedForDeviceRef = useRef<string | null>(null);
  useEffect(() => {
    if (!looksForLinkedPi || !data || linkedPi) return;
    if (refetchedForDeviceRef.current === deviceGuid) return;
    refetchedForDeviceRef.current = deviceGuid;
    void refetch();
  }, [looksForLinkedPi, data, linkedPi, deviceGuid, refetch]);

  return { hostMode: piHost || !!linkedPi, linkedPi };
}

export function useLinkedPiScanTarget({ linkedPi }: PiScanMode, isActive: boolean) {
  const linkedPiGuid = linkedPi?.guid ?? null;
  const linkedPiScanState = linkedPi?.scanState ?? null;

  useEffect(() => {
    if (!isActive) return;
    switchPiScanTarget(linkedPiGuid);
    return () => switchPiScanTarget(null);
  }, [isActive, linkedPiGuid]);

  useEffect(() => {
    if (isActive && linkedPiGuid)
      applyPiScanState(linkedPiScanState ?? IDLE_PI_SCAN_SESSION);
  }, [isActive, linkedPiGuid, linkedPiScanState]);
}
