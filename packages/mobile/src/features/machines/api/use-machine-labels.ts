import type { MachineAttention, MachineStatus } from "@magic-vault/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useMachineLabels() {
  const { t } = useTranslation();

  const attentionLabel = useCallback(
    (attention: MachineAttention) => {
      const binNumbers = attention.binNumbers ?? [];
      if (attention.kind === "binLimit" && binNumbers.length === 0) {
        return t("machines.attention.binLimitUnknown");
      }
      return t(`machines.attention.${attention.kind}`, {
        module: attention.module,
        bins: binNumbers.join(", "),
        count: binNumbers.length,
      });
    },
    [t],
  );

  const statusLabel = useCallback(
    (machine: MachineStatus) =>
      machine.attention ? attentionLabel(machine.attention) : t(`machines.runState.${machine.runState}`),
    [attentionLabel, t],
  );

  return { attentionLabel, statusLabel };
}
