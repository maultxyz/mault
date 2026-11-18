import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/ui/toast-provider";
import { sendMachineCommand } from "@/features/machines/api/machines";
import type { MachineCommandVariables } from "@/lib/interfaces/machines";

export function useMachineCommand() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ machine, command }: MachineCommandVariables) => sendMachineCommand(machine.machineId, command),
    onError: () => showToast({ message: t("machines.controls.failed"), tone: "destructive" }),
  });
}
