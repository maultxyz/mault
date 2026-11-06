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
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function SortersPage() {
  const { t } = useTranslation("scanner");
  const [searchQuery, setSearchQuery] = useState("");
  const overview = useSorterOverview(searchQuery);
  const {
    selectedKeys,
    runningKeys,
    resumableKeys,
    pauseSorters,
    resumeSorters,
  } = useSorterSelection();
  const {
    isLoading,
    connectedSorters,
    offlineDevices,
    sortingCount,
    attentionCount,
    totalCount,
  } = overview;
  const connectedKeys = connectedSorters.map((sorter) => sorter.selectionKey);
  const runningConnectedKeys = connectedKeys.filter((key) =>
    runningKeys.has(key),
  );
  const resumableConnectedKeys = connectedKeys.filter((key) =>
    resumableKeys.has(key),
  );

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
      key: "attention",
      label: t("stations.overview.stats.attention"),
      value: attentionCount.toLocaleString(),
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
          <div className="flex gap-1.5">
            {connectedKeys.length > 1 && (
              <>
                <Button
                  variant="outline"
                  disabled={runningConnectedKeys.length === 0}
                  onClick={() => pauseSorters(runningConnectedKeys)}
                >
                  <IconPlayerPause />
                  {t("stations.overview.pauseAll")}
                </Button>
                <Button
                  variant="outline"
                  disabled={resumableConnectedKeys.length === 0}
                  onClick={() => resumeSorters(resumableConnectedKeys)}
                >
                  <IconPlayerPlay />
                  {t("stations.overview.resumeAll")}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button />}>
                <IconPlus />
                {t("stations.connect")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <ConnectSorterMenuOptions />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {!isLoading && totalCount > 0 && (
          <>
            <StatGroup
              heading={t("stations.overview.stats.heading")}
              tiles={stats}
              live={sortingCount > 0}
              gridClassName="grid-cols-2 sm:grid-cols-5"
            />
            <div className="relative">
              <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
              <Input
                type="search"
                aria-label={t("stations.overview.searchPlaceholder")}
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
