import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
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
import type { ScanLockInfo } from "@/features/collections/api/use-collection-locks";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useSessionViewersByGuid } from "@/features/collections/api/use-live-counts";
import { useOrg } from "@/features/companies/api/use-organization";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
    <div className="size-8 rounded-md border flex items-center justify-center shrink-0">
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
        className={`flex items-center gap-3 px-4 py-3.5 border rounded-lg ${isOwn ? "border-warning-border bg-warning-muted" : ""}`}
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
              {t("cardCount", {
                count: collection.cardCount,
              })}{" "}
              ·{" "}
              {new Date(collection.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
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
          title={t("monitorSessions.title")}
          subtitle={t("monitorSessions.subtitle")}
        />
      )}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="flex flex-col p-3 md:p-6 max-w-4xl mx-auto w-full gap-4">
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

          {!isLoading && sorted.length > 0 && (
            <Input
              placeholder={t("monitorSessions.searchPlaceholder")}
              data-hotkey-search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}

          <div className="flex flex-col gap-5">
            {isLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 border rounded-lg"
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
                icon={<IconHeartRateMonitor className="size-10" />}
                title={t("monitorSessions.noSessionsFound")}
                description={t("monitorSessions.noSessionsHint")}
              />
            )}

            {!isLoading && sorted.length > 0 && filteredSorted.length === 0 && (
              <EmptyState
                icon={<IconHeartRateMonitor className="size-10" />}
                title={t("monitorSessions.noSearchResultsTitle")}
                description={t("monitorSessions.noSearchResultsDescription")}
              />
            )}

            {liveCollections.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                  {t("monitorSessions.liveNow")}
                </h2>
                {liveCollections.map(renderRow)}
              </section>
            )}
            {otherCollections.length > 0 && (
              <section className="flex flex-col gap-2">
                {liveCollections.length > 0 && (
                  <h2 className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                    {t("monitorSessions.allCollections")}
                  </h2>
                )}
                {otherCollections.map(renderRow)}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
