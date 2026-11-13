import { EmptyState } from "@/components/empty-state";
import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { getInitials } from "@/components/ui/initials-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePriceSource } from "@/hooks/use-price-source";
import { useCollectionLocks } from "@/lib/app-stream";
import { MOBILE_HOME_SEARCH_MIN_COLLECTIONS, monitorCollectionPath } from "@/lib/constants/collections";
import { MOBILE_LIST_CLASS, MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { IconAlbum, IconScan } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LibraryCollectionList() {
  const { t } = useTranslation("home");
  const { t: tCollections } = useTranslation("collections");
  const { t: tScanner } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: collections, isLoading } = useQuery({ ...collectionsQueryOptions, enabled: !!activeOrg });
  const { data: overview } = useQuery(orgOverviewQueryOptions(activeOrg?.id));
  const { activeCollection } = useCollections();
  const { locks, currentUserId } = useCollectionLocks();
  const { format } = usePriceSource();
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const sorted = [...(collections ?? [])].sort((a, b) => {
    const aLive = !!locks[a.guid];
    const bLive = !!locks[b.guid];
    if (aLive !== bLive) return aLive ? -1 : 1;
    const aActive = a.guid === activeCollection?.guid;
    const bActive = b.guid === activeCollection?.guid;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  const filtered = query ? sorted.filter((c) => c.name.toLowerCase().includes(query)) : sorted;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-card" />
        ))}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="rounded-card bg-card">
        <EmptyState icon={IconAlbum} title={t("welcome.title")} description={t("welcome.description")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      {sorted.length >= MOBILE_HOME_SEARCH_MIN_COLLECTIONS && (
        <MobileSearchInput
          placeholder={t("library.searchPlaceholder")}
          aria-label={t("library.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      )}
      {filtered.length === 0 ? (
        <div className="rounded-card bg-card">
          <EmptyState
            icon={IconAlbum}
            title={t("library.noSearchResultsTitle")}
            description={t("library.noSearchResultsDescription")}
          />
        </div>
      ) : (
        <div className={MOBILE_LIST_CLASS}>
          {filtered.map((collection) => {
            const lock = locks[collection.guid];
            const isOwn = lock?.userId === currentUserId;
            const isActive = collection.guid === activeCollection?.guid;
            const value = overview?.collectionValues[collection.guid];
            return (
              <Link
                key={collection.guid}
                to={monitorCollectionPath(collection.guid)}
                className={cn(MOBILE_LIST_ROW_CLASS, "min-h-16")}
              >
                {lock ? (
                  <MobileIconBadge tone="warning">{getInitials(lock.displayName)}</MobileIconBadge>
                ) : (
                  <MobileIconBadge tone={isActive ? "primary" : "neutral"}>
                    {isActive ? <IconScan /> : <IconAlbum />}
                  </MobileIconBadge>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{collection.name}</span>
                  <span className="block truncate text-xs font-normal text-foreground/70">
                    {[
                      lock ? (isOwn ? t("live.yourSession") : t("live.scanning")) : isActive ? tCollections("page.activeBadge") : null,
                      tScanner("cardCount", { count: collection.cardCount }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {value != null && <span className="shrink-0 font-semibold tabular-nums">{format(value)}</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
