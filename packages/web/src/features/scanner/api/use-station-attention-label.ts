import type { StationAttention } from "@/lib/interfaces/stations";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useStationAttentionLabel() {
  const { t } = useTranslation("scanner");
  return useCallback(
    (attention: StationAttention) => {
      const binNumbers = attention.binNumbers ?? [];
      if (attention.kind === "binLimit" && binNumbers.length === 0) {
        return t("stations.attention.reasons.binLimitUnknown");
      }
      return t(`stations.attention.reasons.${attention.kind}`, {
        module: attention.module,
        bins: binNumbers.join(", "),
        count: binNumbers.length,
      });
    },
    [t],
  );
}
