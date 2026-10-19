import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";

export function useResetToNeutral() {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { sendNeutral } = useSerial();
  const [isResetting, setIsResetting] = useState(false);

  const resetToNeutral = useCallback(async () => {
    const ok = await sendNeutral();
    if (!ok) {
      toast.error(t("resetToNeutral.failed.title"), {
        description: t("resetToNeutral.failed.description"),
      });
    }
    return ok;
  }, [toast, sendNeutral, t]);

  const handleResetToNeutral = useCallback(async () => {
    setIsResetting(true);
    try {
      const ok = await resetToNeutral();
      if (ok) toast.success(t("resetToNeutral.done"));
      return ok;
    } finally {
      setIsResetting(false);
    }
  }, [toast, resetToNeutral, t]);

  return { resetToNeutral, handleResetToNeutral, isResetting };
}
