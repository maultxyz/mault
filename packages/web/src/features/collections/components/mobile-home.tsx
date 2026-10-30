import { EmptyState } from "@/components/empty-state";
import { MobileIconBadge } from "@/components/mobile-icon-badge";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { MobileQuickAction } from "@/components/mobile-quick-action";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { MobileSection } from "@/components/mobile-section";
import { getInitials } from "@/components/ui/initials-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import { openIntakeLotsQueryOptions } from "@/features/business/api/business";
import { useCollections } from "@/features/collections/api/use-collections";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import {
  MobileHomeHero,
  MobileHomeOverview,
} from "@/features/collections/components/mobile-home-overview";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePriceSource } from "@/hooks/use-price-source";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";
import { useAuthSession } from "@/lib/auth";
import { useCollectionLocks } from "@/lib/app-stream";
import {
  MOBILE_LIST_CLASS,
  MOBILE_LIST_ROW_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_PAGE_BODY_CLASS,
  MOBILE_SCAN_PATH,
} from "@/lib/constants/nav";
import { MOBILE_HOME_SEARCH_MIN_COLLECTIONS } from "@/lib/constants/collections";
import { STATS_PATH } from "@/lib/constants/stats";
import { INTAKE_PATH } from "@/lib/constants/business";
import { cn } from "@/lib/utils";
import {
  IconAlbum,
  IconArrowRight,
  IconCash,
  IconChartBar,
  IconPlus,
  IconScan,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePiHost } from "@/hooks/use-pi-host";
import { isRemoteBrowser } from "@/lib/host";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function MobileHome() {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: collections, isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });
  const { data: overview } = useQuery({
    ...orgOverviewQueryOptions(activeOrg?.id),
    enabled: !!activeOrg,
  });
  const { activeCollection } = useCollections();
  const { data: openIntakeLots = [] } = useQuery(
    openIntakeLotsQueryOptions(activeOrg?.id),
  );
  const openIntakeCount = openIntakeLots.filter(
    (lot) => lot.status === "open",
  ).length;
  const { locks, currentUserId } = useCollectionLocks();
  const { format } = usePriceSource();
  const { data: session } = useAuthSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const heroCollapsed = useScrollCollapse(scrollRoot);
  const scanPath = usePiHost() && isRemoteBrowser() ? "/app" : MOBILE_SCAN_PATH;
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
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
  const filtered = query
    ? sorted.filter((c) => c.name.toLowerCase().includes(query))
    : sorted;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MobilePageHeader
        title={
          firstName
            ? t("home.greeting", { name: firstName })
            : t("home.greetingNoName")
        }
        collapsed={heroCollapsed}
        actions={
          heroCollapsed &&
          overview && (
            <span className="font-heading text-lg font-semibold tabular-nums animate-in fade-in-0 duration-200 motion-reduce:animate-none">
              {format(overview.totalValue)}
            </span>
          )
        }
      >
        <MobileHomeHero orgId={activeOrg?.id} />
      </MobilePageHeader>
      <div
        ref={setScrollRoot}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className={MOBILE_PAGE_BODY_CLASS}>
          <div className="flex flex-col gap-2">
            <Link
              to={scanPath}
              className="flex items-center gap-3 rounded-lg bg-primary p-4 text-primary-foreground transition-colors active:bg-primary-hover"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15 [&_svg]:size-5">
                <IconScan />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-heading text-base font-semibold">
                  {t("home.scanHero.title")}
                </span>
                <span className="truncate text-xs text-primary-foreground/80">
                  {activeCollection
                    ? t("home.scanHero.sortInto", {
                        collection: activeCollection.name,
                      })
                    : t("home.scanHero.noCollection")}
                </span>
              </span>
              <IconArrowRight className="size-5 shrink-0" />
            </Link>
            <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-input bg-input/20 dark:bg-input/30">
              <CreateCollectionDialog
                trigger={({ disabled }) => (
                  <MobileQuickAction
                    icon={<IconPlus />}
                    label={t("home.actions.newCollection")}
                    hint={t("home.actionHints.newCollection")}
                    disabled={disabled}
                  />
                )}
              />
              <MobileQuickAction
                icon={<IconCash />}
                label={t("home.actions.buySell")}
                hint={
                  openIntakeCount > 0
                    ? t("home.actionHints.buySellOpen", {
                        count: openIntakeCount,
                      })
                    : t("home.actionHints.buySell")
                }
                to={INTAKE_PATH}
              />
              <MobileQuickAction
                icon={<IconChartBar />}
                label={t("home.actions.stats")}
                hint={t("home.actionHints.stats")}
                to={STATS_PATH}
              />
            </div>
          </div>

          {!query && <MobileHomeOverview orgId={activeOrg?.id} />}

          <MobileSection title={t("monitorSessions.allCollections")}>
            {sorted.length >= MOBILE_HOME_SEARCH_MIN_COLLECTIONS && (
              <MobileSearchInput
                placeholder={t("monitorSessions.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            )}
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <EmptyState
                icon={IconAlbum}
                title={t("monitorSessions.noSessionsFound")}
                description={t("monitorSessions.noSessionsHint")}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={IconAlbum}
                title={t("monitorSessions.noSearchResultsTitle")}
                description={t("monitorSessions.noSearchResultsDescription")}
              />
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
                      to={`/app/monitor/${collection.guid}`}
                      className={cn(MOBILE_LIST_ROW_CLASS, "min-h-16")}
                    >
                      {lock ? (
                        <MobileIconBadge tone="warning">
                          {getInitials(lock.displayName)}
                        </MobileIconBadge>
                      ) : (
                        <MobileIconBadge
                          tone={isActive ? "primary" : "neutral"}
                        >
                          {isActive ? <IconScan /> : <IconAlbum />}
                        </MobileIconBadge>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">
                          {collection.name}
                        </span>
                        <span className="block truncate text-xs font-normal text-foreground/70">
                          {[
                            lock
                              ? isOwn
                                ? t("monitorSessions.yourSession")
                                : t("monitorSessions.scanning")
                              : isActive
                                ? t("home.activeCollection")
                                : null,
                            t("cardCount", { count: collection.cardCount }),
                            new Date(collection.updatedAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            ),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      {value != null && (
                        <span className="shrink-0 font-semibold tabular-nums">
                          {format(value)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </MobileSection>
        </div>
      </div>
    </div>
  );
}
