import { sendMachineCommand } from "@/features/machines/api/machines";
import type { MachineCommandVariables } from "@/lib/interfaces/machines";
import { toast } from "@/lib/toast";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useMachineCommand() {
  const { t } = useTranslation("machines");
  return useMutation({
    mutationFn: ({ machine, command }: MachineCommandVariables) =>
      sendMachineCommand(machine.machineId, command),
    onError: () => toast.error(t("controls.failed")),
  });
}
