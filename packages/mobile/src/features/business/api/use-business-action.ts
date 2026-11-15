import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useToast } from "@/components/ui/toast-provider";
import { BUSINESS_QUERY_KEY } from "@/lib/constants/business";

export function useBusinessAction() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const announce = useCallback(
    (message: string, tone: "success" | "destructive") => {
      showToast({ message, tone });
      AccessibilityInfo.announceForAccessibility(message);
    },
    [showToast],
  );

  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
      ]),
    [queryClient],
  );

  const run = useCallback(
    async <T,>(
      action: () => Promise<T>,
      successMessage: string | ((result: T) => string),
      afterSuccess?: () => void,
    ): Promise<boolean> => {
      try {
        const result = await action();
        afterSuccess?.();
        announce(typeof successMessage === "string" ? successMessage : successMessage(result), "success");
        return true;
      } catch (error) {
        announce(error instanceof Error ? error.message : t("business.actionFailed"), "destructive");
        return false;
      } finally {
        await refresh();
      }
    },
    [announce, refresh, t],
  );

  return { run, refresh, announce };
}
