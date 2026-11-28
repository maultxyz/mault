import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { TRADES_BOXES } from "@/lib/constants/trade-offers";
import type { TradesBoxSwitchProps } from "@/lib/interfaces/trade-offers";
import { useTranslation } from "react-i18next";

export function TradesBoxSwitch({ box, onChange }: TradesBoxSwitchProps) {
  const { t } = useTranslation("common");
  return (
    <ResponsiveSegmented
      items={TRADES_BOXES.map((key) => ({ key, label: t(`tradeOffers.boxes.${key}`) }))}
      value={box}
      onChange={onChange}
      label={t("tradeOffers.boxes.label")}
      className="self-start"
    />
  );
}
