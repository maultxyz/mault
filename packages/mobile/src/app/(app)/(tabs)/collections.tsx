import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { TabStrip } from "@/components/ui/tab-strip";
import { CollectionsLibraryView } from "@/features/collections/components/collections-library-view";
import { StorageLibraryView } from "@/features/storage/components/storage-library-view";
import type { LibraryView } from "@/lib/interfaces/library";

export default function LibraryScreen() {
  const { t } = useTranslation();
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const view: LibraryView = viewParam === "storage" ? "storage" : "collections";
  const viewSwitcher = (
    <TabStrip
      inline
      items={[
        { value: "collections" as const, label: t("tabs.collections") },
        { value: "storage" as const, label: t("tabs.storage") },
      ]}
      value={view}
      onChange={(next) => router.setParams({ view: next })}
    />
  );
  const title = t("tabs.library");
  return view === "storage" ? (
    <StorageLibraryView title={title} viewSwitcher={viewSwitcher} />
  ) : (
    <CollectionsLibraryView title={title} viewSwitcher={viewSwitcher} />
  );
}
