import {
  MOBILE_LIST_CLASS,
  MOBILE_NAV_SCROLL_PADDING_CLASS,
  MOBILE_HEADER_SEARCH_CLASS,
  MOBILE_SECTION_CLASS,
  MOBILE_SECTION_LABEL_CLASS,
} from "@/lib/constants/nav";
import { MobileSearchInput } from "@/components/mobile-search-input";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { getInitials, InitialsAvatar } from "@/components/ui/initials-avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { WatcherStack } from "@/components/ui/watcher-stack";
import {
  collectionsQueryOptions,
  releaseScanLock,
} from "@/features/collections/api/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePriceSource } from "@/hooks/use-price-source";
import { useAuthSession } from "@/lib/auth";
import { orgOverviewQueryOptions } from "@/features/collections/api/org-overview";
import {
  MobileHomeHero,
  MobileHomeOverview,
} from "@/features/collections/components/mobile-home-overview";
import type { Collection } from "@magic-vault/shared";
import {
  IconChevronRight,
  IconHeartRateMonitor,
  IconLoader2,
  IconLockOpen,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";
import { useCollectionLocks, useSessionViewersByGuid } from "@/lib/app-stream";
import type { ScanLockInfo } from "@/lib/interfaces/collections";

function ScanningPill({ isOwn }: { isOwn?: boolean }) {
  const { t } = useTranslation("scanner");
  return (
    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-warning-muted ring-1 ring-warning-border text-warning-foreground">
      <span className="size-1.5 rounded-full bg-warning animate-pulse shrink-0" />
      <span className="text-2xs font-medium">
        {isOwn
          ? t("monitorSessions.yourSession")
          : t("monitorSessions.scanning")}
      </span>
    </span>
  );
}

function StatusIcon({
  scannerLock,
  watcherCount,
}: {
  scannerLock?: ScanLockInfo;
  watcherCount: number;
}) {
  if (scannerLock) {
    return (
      <div className="size-8 rounded-md flex items-center justify-center shrink-0 bg-warning-muted border border-warning-border">
        <span className="text-xs font-bold text-warning-foreground">
          {getInitials(scannerLock.displayName)}
        </span>
      </div>
    );
  }
  if (watcherCount > 0) {
    return (
      <div className="size-8 rounded-md flex items-center justify-center shrink-0 bg-success-muted border border-success-border">
        <span className="text-xs font-bold text-success-foreground">
          {watcherCount}
        </span>
      </div>
    );
  }
  return (
    <div className="size-8 rounded-md border bg-muted flex items-center justify-center shrink-0">
      <span className="size-2 rounded-full bg-muted-foreground/30" />
    </div>
  );
}

function ReleaseButton({ guid }: { guid: string }) {
  const { t } = useTranslation("scanner");
  const [releasing, setReleasing] = useState(false);

  const handleRelease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReleasing(true);
    try {
      await releaseScanLock(guid);
      toast.success(t("monitorSessions.sessionReleased"));
    } catch {
      toast.error(t("monitorSessions.releaseFailed"));
    } finally {
      setReleasing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRelease}
      disabled={releasing}
      title={t("monitorSessions.leaveSession")}
      className="flex items-center justify-center size-7 rounded-md border border-warning-border text-warning-foreground hover:bg-warning-muted transition-colors disabled:opacity-50 shrink-0"
    >
      {releasing ? (
        <IconLoader2 className="size-3.5 animate-spin" />
      ) : (
        <IconLockOpen className="size-3.5" />
      )}
    </button>
  );
}

export default function MonitorSessionsPage() {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: collections, isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });
  const allViewers = useSessionViewersByGuid();
  const { locks, currentUserId } = useCollectionLocks();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = useAuthSession();
  const firstName = session?.user?.name?.trim().split(/\s+/)[0];
  const { data: overview } = useQuery({
    ...orgOverviewQueryOptions(activeOrg?.id),
    enabled: isMobile && !!activeOrg,
  });
  const { format } = usePriceSource();
  const listClass = isMobile
    ? MOBILE_LIST_CLASS
    : "flex flex-col divide-y overflow-hidden rounded-lg border";
  const sectionClass = isMobile ? MOBILE_SECTION_CLASS : "flex flex-col gap-2";
  const sectionLabelClass = isMobile
    ? MOBILE_SECTION_LABEL_CLASS
    : "text-xs font-medium uppercase tracking-wide text-foreground/70";

  const sorted = [...(collections ?? [])].sort((a, b) => {
    const aOwn = locks[a.guid]?.userId === currentUserId;
    const bOwn = locks[b.guid]?.userId === currentUserId;
    if (aOwn !== bOwn) return aOwn ? -1 : 1;
    const aScanning = !!locks[a.guid];
    const bScanning = !!locks[b.guid];
    if (aScanning !== bScanning) return aScanning ? -1 : 1;
    const aViewers = (allViewers?.[a.guid]?.length ?? 0) > 0;
    const bViewers = (allViewers?.[b.guid]?.length ?? 0) > 0;
    if (aViewers !== bViewers) return aViewers ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredSorted = sorted.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const liveCollections = filteredSorted.filter((c) => !!locks[c.guid]);
  const otherCollections = filteredSorted.filter((c) => !locks[c.guid]);

  const renderRow = (collection: Collection) => {
    const rawViewers = allViewers?.[collection.guid] ?? [];
    const scannerLock = locks[collection.guid];
    const isOwn = scannerLock?.userId === currentUserId;
    const watchers = rawViewers.filter(
      (v) => v.userId !== scannerLock?.userId && v.userId !== currentUserId,
    );

    return (
      <div
        key={collection.guid}
        className={cn(
          "flex items-center gap-3",
          isMobile ? "min-h-14 rounded-md px-2 py-2" : "px-4 py-3.5",
          isOwn && "bg-warning-muted",
        )}
      >
        <button
          type="button"
          onClick={() => navigate(`/app/monitor/${collection.guid}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 active:opacity-60 transition-opacity"
        >
          <StatusIcon
            scannerLock={scannerLock}
            watcherCount={watchers.length}
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{collection.name}</p>
            <p className="text-xs text-foreground/70">
              {[
                t("cardCount", { count: collection.cardCount }),
                overview?.collectionValues[collection.guid] != null &&
                  format(overview.collectionValues[collection.guid]),
                new Date(collection.updatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {scannerLock && (
            <>
              {!isOwn && (
                <InitialsAvatar
                  name={scannerLock.displayName}
                  variant="scanner"
                  size="sm"
                  tooltip={t("isScanningTooltip", {
                    name: scannerLock.displayName,
                  })}
                />
              )}
              <ScanningPill isOwn={isOwn} />
            </>
          )}
          {watchers.length > 0 && <WatcherStack watchers={watchers} />}
          {isOwn && <ReleaseButton guid={collection.guid} />}
          <IconChevronRight className="size-4 text-foreground/70" />
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader
          variant="brand"
          title={
            firstName
              ? t("home.greeting", { name: firstName })
              : t("home.greetingNoName")
          }
          subtitle={activeOrg?.name}
        >
          <MobileHomeHero orgId={activeOrg?.id} />
          {!isLoading && sorted.length > 0 && (
            <MobileSearchInput
              placeholder={t("monitorSessions.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={MOBILE_HEADER_SEARCH_CLASS}
            />
          )}
        </MobilePageHeader>
      )}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-5">
          {!isMobile && (
            <div>
              <h1 className="text-lg font-semibold font-heading">
                {t("monitorSessions.title")}
              </h1>
              <p className="text-xs text-foreground/70">
                {t("monitorSessions.subtitle")}
              </p>
            </div>
          )}

          {!isMobile && !isLoading && sorted.length > 0 && (
            <Input
              placeholder={t("monitorSessions.searchPlaceholder")}
              data-hotkey-search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          {isMobile && !searchQuery.trim() && (
            <MobileHomeOverview orgId={activeOrg?.id} />
          )}

          <div className="flex flex-col gap-5">
            {isLoading && (
              <div className={listClass}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3.5 px-4 py-3.5"
                  >
                    <Skeleton className="size-8 rounded-md shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && sorted.length === 0 && (
              <EmptyState
                icon={IconHeartRateMonitor}
                title={t("monitorSessions.noSessionsFound")}
                description={t("monitorSessions.noSessionsHint")}
              />
            )}

            {!isLoading && sorted.length > 0 && filteredSorted.length === 0 && (
              <EmptyState
                icon={IconHeartRateMonitor}
                title={t("monitorSessions.noSearchResultsTitle")}
                description={t("monitorSessions.noSearchResultsDescription")}
              />
            )}

            {liveCollections.length > 0 && (
              <section className={sectionClass}>
                <h2 className={sectionLabelClass}>
                  {t("monitorSessions.liveNow")}
                </h2>
                <div className={listClass}>
                  {liveCollections.map(renderRow)}
                </div>
              </section>
            )}
            {otherCollections.length > 0 && (
              <section className={sectionClass}>
                {(isMobile || liveCollections.length > 0) && (
                  <h2 className={sectionLabelClass}>
                    {t("monitorSessions.allCollections")}
                  </h2>
                )}
                <div className={listClass}>
                  {otherCollections.map(renderRow)}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
