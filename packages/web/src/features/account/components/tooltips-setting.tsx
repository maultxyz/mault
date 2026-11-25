import { Switch } from "@/components/ui/switch";
import { setTooltipsEnabled, useTooltipsEnabled } from "@/lib/tooltips-store";
import { useTranslation } from "react-i18next";

export function TooltipsSetting() {
  const { t } = useTranslation("account");
  const tooltipsEnabled = useTooltipsEnabled();
  return (
    <Switch
      aria-label={t("tooltips.label")}
      checked={tooltipsEnabled}
      onCheckedChange={setTooltipsEnabled}
    />
  );
}
