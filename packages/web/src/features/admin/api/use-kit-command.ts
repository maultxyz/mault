import { useSerial } from "@/features/scanner/api/use-serial";
import { KIT_COMMAND_TIMEOUT_MS } from "@/lib/constants/kit-test";
import { toast } from "@/lib/toast";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useKitCommand() {
  const { t } = useTranslation("admin");
  const { sendRawCommand } = useSerial();

  return useCallback(
    async (payload: unknown): Promise<string | null> => {
      const result = await sendRawCommand(
        JSON.stringify(payload),
        KIT_COMMAND_TIMEOUT_MS,
      );
      const ok = result.status === "ok" && !result.line?.includes('"error"');
      if (!ok) {
        toast.error(t("kitTest.toasts.commandFailed"), {
          description: result.line ?? t(`kitTest.status.${result.status}`),
        });
        return null;
      }
      return result.line;
    },
    [sendRawCommand, t],
  );
}
