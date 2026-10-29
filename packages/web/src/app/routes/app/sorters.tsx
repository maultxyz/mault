import { PageHeader } from "@/components/page-header";
import { StatGroup } from "@/components/stat-group";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { FleetHealthPanel } from "@/features/business/components/fleet-health-panel";
import { useSorterOverview } from "@/features/scanner/api/use-sorter-overview";
import { useSorterSelection } from "@/features/scanner/api/use-sorter-selection";
import { ConnectSorterMenuOptions } from "@/features/scanner/components/connect-sorter-menu-options";
import { StationOverviewGrid } from "@/features/scanner/components/station-overview-grid";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SortersPage() {
  const { t } = useTranslation("scanner");
  const [searchQuery, setSearchQuery] = useState("");
  const overview = useSorterOverview(searchQuery);
  const { selectedKeys } = useSorterSelection();
  const {
    isLoading,
    connectedSorters,
    offlineDevices,
    sortingCount,
    totalCount,
  } = overview;

  const stats = [
    {
      key: "sorters",
      label: t("stations.overview.stats.sorters"),
      value: totalCount.toLocaleString(),
    },
    {
      key: "connected",
      label: t("stations.overview.stats.connected"),
      value: connectedSorters.length.toLocaleString(),
    },
    {
      key: "sorting",
      label: t("stations.overview.stats.sorting"),
      value: sortingCount.toLocaleString(),
    },
    {
      key: "offline",
      label: t("stations.overview.stats.offline"),
      value: offlineDevices.length.toLocaleString(),
    },
  ];

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      <PageHeader
        title={t("stations.overview.title")}
        description={t("stations.overview.description")}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}>
              <IconPlus />
              {t("stations.connect")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ConnectSorterMenuOptions />
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        {!isLoading && totalCount > 0 && (
          <>
            <StatGroup
              heading={t("stations.overview.stats.heading")}
              tiles={stats}
              live={sortingCount > 0}
              gridClassName="grid-cols-2 sm:grid-cols-4"
            />
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
              <Input
                type="search"
                placeholder={t("stations.overview.searchPlaceholder")}
                data-hotkey-search
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8"
              />
            </div>
          </>
        )}
      </PageHeader>

      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6",
          selectedKeys.size > 0 && "pb-24 md:pb-24",
        )}
      >
        <StationOverviewGrid
          overview={overview}
          isSearching={!!searchQuery.trim()}
        />
        <FleetHealthPanel />
      </div>
    </div>
  );
}
