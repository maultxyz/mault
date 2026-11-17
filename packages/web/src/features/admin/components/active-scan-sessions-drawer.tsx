import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveScanSessions } from "@/lib/api/admin";
import { ACTIVE_SCANNING_REFRESH_MS } from "@/lib/constants/admin";
import type { ActiveScanSessionsDrawerProps } from "@/lib/interfaces/admin";
import type { ActiveScanSession } from "@magic-vault/shared";
import { IconScan, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByOrg(sessions: ActiveScanSession[]) {
  const groups = new Map<string, ActiveScanSession[]>();
  for (const session of sessions) {
    const group = groups.get(session.orgId);
    if (group) group.push(session);
    else groups.set(session.orgId, [session]);
  }
  return [...groups.entries()];
}

export function ActiveScanSessionsDrawer({
  open,
  onOpenChange,
}: ActiveScanSessionsDrawerProps) {
  const { t } = useTranslation("admin");

  const sessionsQuery = useQuery({
    queryKey: ["admin", "active-scanning", "sessions"],
    queryFn: () => getActiveScanSessions().then((r) => r.data ?? []),
    enabled: open,
    refetchInterval: open ? ACTIVE_SCANNING_REFRESH_MS : false,
    staleTime: 0,
  });

  const groups = useMemo(
    () => groupByOrg(sessionsQuery.data ?? []),
    [sessionsQuery.data],
  );

  const collectionLabel = (session: ActiveScanSession) => {
    const collection =
      session.collectionName ?? t("activeScanSessions.unknownCollection");
    return session.gameName
      ? t("activeScanSessions.collectionWithGame", {
          collection,
          game: session.gameName,
        })
      : collection;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <IconScan className="size-3.5 text-foreground/70" />
            <DrawerTitle>{t("activeScanSessions.title")}</DrawerTitle>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label={t("activeScanSessions.close")}
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              <IconX className="size-3.5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {sessionsQuery.isLoading ? (
            <div className="flex flex-col gap-3 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={IconScan}
              size="compact"
              title={t("activeScanSessions.empty")}
              description={t("activeScanSessions.emptyDescription")}
            />
          ) : (
            <div className="flex flex-col gap-3 p-3">
              {groups.map(([orgId, sessions]) => (
                <section
                  key={orgId}
                  className="overflow-hidden rounded-lg border"
                >
                  <div className="flex items-center justify-between gap-2 border-b bg-muted px-3 py-2">
                    <p className="truncate text-sm font-medium">
                      {sessions[0].orgName ?? orgId}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {t("activeScanSessions.sessionCount", {
                        count: sessions.length,
                      })}
                    </Badge>
                  </div>
                  <div className="flex flex-col divide-y">
                    {sessions.map((session) => (
                      <div
                        key={session.collectionGuid}
                        className="flex flex-col gap-1 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {session.displayName}
                          </p>
                          <span className="shrink-0 text-xs tabular-nums text-foreground/70">
                            {t("activeScanSessions.scans", {
                              count: session.scansThisSession,
                            })}
                          </span>
                        </div>
                        <p className="truncate text-xs text-foreground/70">
                          {collectionLabel(session)}
                        </p>
                        <p className="text-2xs text-foreground/70">
                          {t("activeScanSessions.timing", {
                            started: formatTime(session.startedAt),
                            lastActivity: formatTime(session.lastActivityAt),
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
