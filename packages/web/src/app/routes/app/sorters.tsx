import { StationOverviewGrid } from "@/features/scanner/components/station-overview-grid";
import { useTranslation } from "react-i18next";

export default function SortersPage() {
  const { t } = useTranslation("scanner");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full">
        <div>
          <h1 className="font-heading text-lg font-semibold">
            {t("stations.overview.title")}
          </h1>
          <p className="text-xs text-foreground/70">
            {t("stations.overview.description")}
          </p>
        </div>
        <StationOverviewGrid />
      </div>
    </div>
  );
}
