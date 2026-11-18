import { useMachineCameraUploads } from "@/features/machines/api/use-machine-camera-uploads";
import { useMachineCommandListener } from "@/features/machines/api/use-machine-command-listener";
import { useMachineStatusPublishing } from "@/features/machines/api/use-machine-status-publishing";
import { useStationMachineStatus } from "@/features/machines/api/use-station-machine-status";
import { stationMachineId } from "@/features/machines/lib/station-machine-id";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStation } from "@/features/scanner/api/use-stations";
import type { MachineCommand } from "@magic-vault/shared";
import { useCallback } from "react";

export function MachineStatusPublisher() {
  const { station } = useStation();
  const machineId = stationMachineId(station);
  const status = useStationMachineStatus();
  const { stream } = useCameraContext();
  const { pause, resume, emergencyStop } = useScannedCards();

  useMachineStatusPublishing(machineId, status);
  useMachineCameraUploads(machineId, status.hasCamera ? stream : null);

  const runCommand = useCallback(
    (command: MachineCommand) => {
      if (command === "emergencyStop") {
        if (status.canEmergencyStop) void emergencyStop();
        return;
      }
      if (command === "pause" && status.canPause) pause();
      if (command === "resume" && status.canResume) resume();
    },
    [status.canEmergencyStop, status.canPause, status.canResume, emergencyStop, pause, resume],
  );
  useMachineCommandListener(machineId, runCommand);

  return null;
}
