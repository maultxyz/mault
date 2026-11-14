import { ViewTabs } from "@/components/view-tabs";
import { StorageLocationCards } from "@/features/storage/components/storage-location-cards";
import { StorageLocationVerify } from "@/features/storage/components/storage-location-verify";
import {
  STORAGE_LOCATION_VIEWS,
  STORAGE_PAGE_SEARCH_PARAM,
  STORAGE_VIEW_SEARCH_PARAM,
} from "@/lib/constants/storage";
import type {
  StorageLocationCardsProps,
  StorageLocationView,
} from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function StorageLocationContent(props: StorageLocationCardsProps) {
  const { t } = useTranslation("storage");
  const [searchParams, setSearchParams] = useSearchParams();
  const view: StorageLocationView =
    searchParams.get(STORAGE_VIEW_SEARCH_PARAM) === "verify"
      ? "verify"
      : "cards";

  const changeView = (next: StorageLocationView) =>
    setSearchParams(
      (params) => {
        if (next === "cards") params.delete(STORAGE_VIEW_SEARCH_PARAM);
        else params.set(STORAGE_VIEW_SEARCH_PARAM, next);
        params.delete(STORAGE_PAGE_SEARCH_PARAM);
        return params;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <ViewTabs<StorageLocationView>
        label={t("verify.tabs.label")}
        items={STORAGE_LOCATION_VIEWS.map((key) => ({
          key,
          label: t(`verify.tabs.${key}`),
        }))}
        value={view}
        onChange={changeView}
      />
      {view === "verify" ? (
        <StorageLocationVerify
          key={props.location.guid}
          location={props.location}
        />
      ) : (
        <StorageLocationCards key={props.location.guid} {...props} />
      )}
    </div>
  );
}
