import { FEEDER_CALIBRATION_TIP_STEP_KEYS } from "@/lib/constants/build";
import { useTranslation } from "react-i18next";

export function FeederCalibrationTip() {
  const { t } = useTranslation("build");

  return (
    <details className="max-w-2xl rounded-lg bg-foreground/6 px-3 py-2 text-sm/relaxed">
      <summary className="cursor-pointer font-medium">
        {t("assembly.phases.wireAndCalibrate.steps.calibrateFeeder.tip.title")}
      </summary>
      <ol className="mt-1.5 flex list-decimal flex-col gap-1 pl-5 text-foreground/70">
        {FEEDER_CALIBRATION_TIP_STEP_KEYS.map((stepKey) => (
          <li key={stepKey}>
            {t(
              `assembly.phases.wireAndCalibrate.steps.calibrateFeeder.tip.steps.${stepKey}`,
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
