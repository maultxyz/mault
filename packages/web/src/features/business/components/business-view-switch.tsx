import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  BUSINESS_VIEW_PATHS,
  BUSINESS_VIEWS,
} from "@/lib/constants/business";
import type {
  BusinessView,
  BusinessViewSwitchProps,
} from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function BusinessViewSwitch({ value }: BusinessViewSwitchProps) {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  return (
    <ResponsiveSegmented<BusinessView>
      label={t("views.label")}
      size="sm"
      className="w-full *:flex-1"
      items={BUSINESS_VIEWS.map((view) => ({
        key: view,
        label: t(`views.${view}`),
      }))}
      value={value}
      onChange={(view) => navigate(BUSINESS_VIEW_PATHS[view])}
    />
  );
}
