import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  BUSINESS_INTAKE_VIEW,
  BUSINESS_VIEW_PARAM,
  BUSINESS_VIEWS,
} from "@/lib/constants/business";
import type {
  BusinessView,
  BusinessViewSwitchProps,
} from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function BusinessViewSwitch({ value }: BusinessViewSwitchProps) {
  const { t } = useTranslation("business");
  const [, setSearchParams] = useSearchParams();
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
      onChange={(view) =>
        setSearchParams(
          view === BUSINESS_INTAKE_VIEW ? {} : { [BUSINESS_VIEW_PARAM]: view },
          { replace: true },
        )
      }
    />
  );
}
