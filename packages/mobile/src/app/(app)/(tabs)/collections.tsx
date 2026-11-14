import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { TabStrip } from "@/components/ui/tab-strip";
import { CollectionsLibraryView } from "@/features/collections/components/collections-library-view";
import { StorageLibraryView } from "@/features/storage/components/storage-library-view";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { TradesLibraryView } from "@/features/trade-offers/components/trades-library-view";
import { useActiveOrgId } from "@/hooks/use-org";
import { LIBRARY_VIEWS } from "@/lib/constants/library";
import type { LibraryView } from "@/lib/interfaces/library";

export default function LibraryScreen() {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const { data: pendingTradeOffers = [] } = useQuery(pendingTradeOffersQueryOptions(orgId));
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const view: LibraryView = LIBRARY_VIEWS.find((candidate) => candidate === viewParam) ?? "collections";
  const viewSwitcher = (
    <TabStrip
      inline
      items={[
        { value: "collections" as const, label: t("tabs.collections") },
        { value: "storage" as const, label: t("tabs.storage") },
        { value: "trades" as const, label: t("tabs.trades"), badge: pendingTradeOffers.length },
      ]}
      value={view}
      onChange={(next) => router.setParams({ view: next })}
    />
  );
  const title = t("tabs.library");
  if (view === "storage") return <StorageLibraryView title={title} viewSwitcher={viewSwitcher} />;
  if (view === "trades") return <TradesLibraryView title={title} viewSwitcher={viewSwitcher} />;
  return <CollectionsLibraryView title={title} viewSwitcher={viewSwitcher} />;
}
