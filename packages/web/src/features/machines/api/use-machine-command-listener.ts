import { useAppStreamSource } from "@/lib/app-stream";
import {
  MACHINE_COMMAND_EVENT,
  type MachineCommand,
  type MachineCommandEvent,
} from "@magic-vault/shared";
import { useEffect, useRef } from "react";

export function useMachineCommandListener(
  machineId: string,
  runCommand: (command: MachineCommand) => void,
) {
  const eventSource = useAppStreamSource();
  const runCommandRef = useRef(runCommand);
  const handledCommandIds = useRef(new Set<string>());

  useEffect(() => {
    runCommandRef.current = runCommand;
  }, [runCommand]);

  useEffect(() => {
    if (!eventSource) return;
    const handleCommand = (event: Event) => {
      const command = JSON.parse((event as MessageEvent).data) as MachineCommandEvent;
      if (command.machineId !== machineId) return;
      if (handledCommandIds.current.has(command.commandId)) return;
      handledCommandIds.current.add(command.commandId);
      runCommandRef.current(command.command);
    };
    eventSource.addEventListener(MACHINE_COMMAND_EVENT, handleCommand);
    return () => eventSource.removeEventListener(MACHINE_COMMAND_EVENT, handleCommand);
  }, [eventSource, machineId]);
}
