import { EmptyState } from "@/components/empty-state";
import { IconHistory } from "@tabler/icons-react";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_LOG_SKELETON_ROWS } from "@/lib/constants/skeletons";
import { useOrgLocal } from "@/features/companies/api/use-organization.local";
import { apiGet } from "@/lib/api/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { LocalAuditEventRow } from "@/lib/interfaces/auth";
import { formatShortDateTime } from "@/lib/format";

export function LocalAuditLog() {
  const { t } = useTranslation("companies");
  const { activeOrg } = useOrgLocal();
  const [events, setEvents] = useState<LocalAuditEventRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canView = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  useEffect(() => {
    if (!activeOrg || !canView) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiGet<{ success: boolean; data?: LocalAuditEventRow[] }>(
      "/api/local-auth/audit-events",
    )
      .then((res) => {
        if (!cancelled) setEvents(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeOrg, canView]);

  if (!canView) {
    return (
      <p className="text-xs text-foreground/70">
        {t("auditLog.membersOnly")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <p className="text-xs text-foreground/70">
        {t("auditLog.description")}
      </p>

      {isLoading && (
        <SkeletonStatus className="flex flex-col divide-y divide-border">
          {Array.from({ length: AUDIT_LOG_SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex h-8 items-center gap-3 px-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-3 w-24 shrink-0" />
            </div>
          ))}
        </SkeletonStatus>
      )}

      {!isLoading && events?.length === 0 && (
        <EmptyState size="compact" icon={IconHistory} title={t("auditLog.empty")} />
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
          {events.slice(0, 100).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 px-3 py-2 text-xs"
            >
              <span className="flex-1 truncate font-mono">
                {event.eventType}
              </span>
              {event.actor && (
                <span className="truncate text-foreground/70">
                  {event.actor}
                </span>
              )}
              <span className="shrink-0 text-foreground/70">
                {formatShortDateTime(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
