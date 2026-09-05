import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { listImpersonationAudit } from "@/lib/api/admin";
import { IconClockHour3, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface ImpersonationAuditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ImpersonationAuditDrawer({
  open,
  onOpenChange,
}: ImpersonationAuditDrawerProps) {
  const { t } = useTranslation("admin");

  const auditQuery = useQuery({
    queryKey: ["admin", "impersonation-audit"],
    queryFn: () => listImpersonationAudit().then((r) => r.data ?? []),
    enabled: open,
    // Always refetch on open rather than trusting a cached fetch - this
    // list is what confirms a session actually ended, so a stale "Active"
    // row here (e.g. reopening shortly after exiting) is actively
    // misleading, not just a mildly outdated count.
    staleTime: 0,
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <IconClockHour3 size={14} className="text-muted-foreground" />
            <DrawerTitle>
              {t("impersonationAuditDrawer.title")}
            </DrawerTitle>
          </div>
          <DrawerClose asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconX size={14} />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {auditQuery.isLoading ? (
            <div className="flex flex-col gap-3 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : auditQuery.data?.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t("impersonationAuditDrawer.empty")}
            </p>
          ) : (
            <div className="flex flex-col divide-y">
              {auditQuery.data?.map((entry) => (
                <div key={entry.guid} className="p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {t("impersonationAuditDrawer.entryLabel", {
                        admin: entry.adminEmail ?? "?",
                        target: entry.targetEmail ?? "?",
                      })}
                    </p>
                    {!entry.endedAt && (
                      <Badge variant="success" className="shrink-0">
                        {t("impersonationAuditDrawer.active")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.endedAt
                      ? t("impersonationAuditDrawer.startedAndEnded", {
                          started: formatDate(entry.startedAt),
                          ended: formatDate(entry.endedAt),
                        })
                      : t("impersonationAuditDrawer.startedOnly", {
                          started: formatDate(entry.startedAt),
                        })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
