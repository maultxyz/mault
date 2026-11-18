import { useActivePresetWorkflow } from "@/features/bins/api/use-active-preset-workflow";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useComputedBinFillLevels } from "@/features/scanner/api/use-computed-bin-fill-levels";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationName } from "@/features/scanner/api/use-station-name";
import { useStation } from "@/features/scanner/api/use-stations";
import { stationCanResume } from "@/features/scanner/lib/station-attention";
import {
  MACHINE_NAME_MAX_LENGTH,
  machineBinFillFromCounts,
  type MachineRunState,
  type MachineStatusInput,
} from "@magic-vault/shared";
import { useMemo } from "react";

export function useStationMachineStatus(): MachineStatusInput {
  const { station, index } = useStation();
  const name = useStationName(station, index);
  const { activeCollection } = useCollections();
  const {
    isTimerActive,
    sessionScanCount,
    attention,
    isEmergencyStopped,
  } = useScannedCards();
  const { isConnected, isReady } = useSerial();
  const { configs, selectedSet } = useBinConfigs();
  const presetWorkflow = useActivePresetWorkflow();
  const { levels } = useComputedBinFillLevels();
  const { stream, status: cameraStatus, cameraSource } = useCameraContext();

  return useMemo(() => {
    const runState: MachineRunState = isEmergencyStopped || attention
      ? "attention"
      : isTimerActive
        ? "running"
        : sessionScanCount > 0
          ? "paused"
          : "idle";
    const levelByBin = new Map(levels.map((level) => [level.binNumber, level]));
    return {
      name: name.slice(0, MACHINE_NAME_MAX_LENGTH),
      deviceGuid: station.deviceGuid,
      collectionGuid: activeCollection?.guid ?? null,
      collectionName: activeCollection?.name ?? null,
      runState,
      attention: isEmergencyStopped
        ? { kind: "emergencyStopped" }
        : attention
          ? {
              kind: attention.kind,
              module: attention.module,
              binNumbers: attention.binNumbers,
              detail: attention.detail?.slice(0, 300),
            }
          : null,
      isEmergencyStopped,
      canPause: isTimerActive,
      canResume: !isEmergencyStopped && stationCanResume(isReady, isTimerActive, attention),
      canEmergencyStop: isConnected && !isEmergencyStopped,
      sessionScanCount,
      presetName: selectedSet?.name ?? null,
      workflowStep: presetWorkflow.workflow
        ? {
            workflowName: presetWorkflow.workflow.name,
            position: presetWorkflow.stageNumber,
            stepCount: presetWorkflow.stageCount,
          }
        : null,
      binFill:
        configs.length > 0
          ? machineBinFillFromCounts(
              configs,
              (binNumber) => levelByBin.get(binNumber)?.count ?? 0,
              (binNumber) => levelByBin.get(binNumber)?.capacity ?? null,
            )
          : null,
      hasCamera: cameraSource === "local" && cameraStatus === "ready" && !!stream,
      lastCard: null,
    };
  }, [
    name,
    station.deviceGuid,
    activeCollection?.guid,
    activeCollection?.name,
    isTimerActive,
    sessionScanCount,
    attention,
    isEmergencyStopped,
    isConnected,
    isReady,
    configs,
    selectedSet?.name,
    presetWorkflow.workflow,
    presetWorkflow.stageNumber,
    presetWorkflow.stageCount,
    levels,
    stream,
    cameraStatus,
    cameraSource,
  ]);
}
