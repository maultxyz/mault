import {
  publishMachineStatus,
  removeMachineStatus,
  removeMachineStatusOnPageExit,
} from "@/features/machines/api/machines";
import {
  MACHINE_STATUS_HEARTBEAT_MS,
  MACHINE_STATUS_PUBLISH_DEBOUNCE_MS,
  type MachineStatusInput,
} from "@magic-vault/shared";
import { useEffect, useMemo, useState } from "react";

export function useMachineStatusPublishing(machineId: string, input: MachineStatusInput) {
  const signature = useMemo(() => JSON.stringify(input), [input]);
  const [heartbeat, setHeartbeat] = useState(0);
  const needsHeartbeat = input.runState === "running" || input.runState === "attention";

  useEffect(() => {
    const timer = setTimeout(() => {
      void publishMachineStatus(machineId, JSON.parse(signature) as MachineStatusInput).catch(
        () => undefined,
      );
    }, MACHINE_STATUS_PUBLISH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [machineId, signature, heartbeat]);

  useEffect(() => {
    if (!needsHeartbeat) return;
    const timer = setInterval(() => setHeartbeat((beat) => beat + 1), MACHINE_STATUS_HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [needsHeartbeat]);

  useEffect(() => {
    const removeOnExit = () => void removeMachineStatusOnPageExit(machineId);
    window.addEventListener("pagehide", removeOnExit);
    return () => {
      window.removeEventListener("pagehide", removeOnExit);
      void removeMachineStatus(machineId).catch(() => undefined);
    };
  }, [machineId]);
}
