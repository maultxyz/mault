import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSeasonalDecorPreference } from "@/hooks/use-seasonal-decor";
import {
  SEASONAL_DECOR_PREFERENCE_LABEL_KEYS,
  SEASONAL_DECOR_PREFERENCES,
} from "@/lib/constants/seasonal";
import type { SeasonalDecorPreference } from "@/lib/interfaces/seasonal";
import { useTranslation } from "react-i18next";

export function SeasonalDecorSetting() {
  const { t } = useTranslation("account");
  const { preference, setPreference } = useSeasonalDecorPreference();
  return (
    <Select
      value={preference}
      onValueChange={(value) => setPreference(value as SeasonalDecorPreference)}
    >
      <SelectTrigger aria-label={t("seasonalDecor.label")} className="min-w-44">
        <SelectValue>{t(SEASONAL_DECOR_PREFERENCE_LABEL_KEYS[preference])}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SEASONAL_DECOR_PREFERENCES.map((option) => (
          <SelectItem key={option} value={option}>
            {t(SEASONAL_DECOR_PREFERENCE_LABEL_KEYS[option])}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
