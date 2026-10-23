import { ResponsiveSegmented } from "@/components/responsive-segmented";
import {
  STORAGE_BOXES_VIEW,
  STORAGE_VIEW_PARAM,
  STORAGE_VIEWS,
} from "@/lib/constants/storage";
import type {
  StorageView,
  StorageViewSwitchProps,
} from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function StorageViewSwitch({ value }: StorageViewSwitchProps) {
  const { t } = useTranslation("storage");
  const [, setSearchParams] = useSearchParams();
  return (
    <ResponsiveSegmented<StorageView>
      label={t("views.label")}
      size="sm"
      className="w-full *:flex-1"
      items={STORAGE_VIEWS.map((view) => ({
        key: view,
        label: t(`views.${view}`),
      }))}
      value={value}
      onChange={(view) =>
        setSearchParams(
          view === STORAGE_BOXES_VIEW ? {} : { [STORAGE_VIEW_PARAM]: view },
          { replace: true },
        )
      }
    />
  );
}
