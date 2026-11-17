import { Button } from "@/components/ui/button";
import { useDetectModuleCount } from "@/features/calibration/api/use-detect-module-count";
import { IconRadar } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DetectModulesButton() {
  const { t } = useTranslation("calibration");
  const { isSupported, canDetect, detect } = useDetectModuleCount();
  if (!isSupported) return null;
  return (
    <Button
      type="button"
      variant="outline"
      disabled={!canDetect}
      onClick={() => void detect()}
    >
      <IconRadar />
      {t("moduleCountStepper.detect.button")}
    </Button>
  );
}
