import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSerial } from "@/features/scanner/api/use-serial";
import { toast } from "@/lib/toast";

export function useResetToNeutral() {
  const { t } = useTranslation("scanner");
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
  }, [sendNeutral, t]);

  const handleResetToNeutral = useCallback(async () => {
    setIsResetting(true);
    try {
      if (await resetToNeutral()) {
        toast.success(t("resetToNeutral.done"));
      }
    } finally {
      setIsResetting(false);
    }
  }, [resetToNeutral, t]);

  return { resetToNeutral, handleResetToNeutral, isResetting };
}
