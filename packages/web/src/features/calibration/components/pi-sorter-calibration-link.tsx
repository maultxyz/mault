import { MobileListRow } from "@/components/mobile-list-row";
import { usePiHostState } from "@/hooks/use-pi-host";
import {
  CALIBRATE_PATH,
  CALIBRATION_SECTION_PATHS,
} from "@/lib/constants/calibration";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import { IconAdjustments } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PiSorterCalibrationLink() {
  const { t } = useTranslation("scanner");
  const { piSorter, settled } = usePiHostState();
  if (!settled || !piSorter) return null;

  return (
    <div className={MOBILE_LIST_CLASS}>
      <MobileListRow
        to={`${CALIBRATE_PATH}/${CALIBRATION_SECTION_PATHS.calibration}`}
        icon={<IconAdjustments />}
        label={t("mobileSorter.calibrate")}
        description={t("serial.piSorterBuiltIn")}
      />
    </div>
  );
}
