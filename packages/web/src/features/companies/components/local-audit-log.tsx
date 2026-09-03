import { Skeleton } from "@/components/ui/skeleton";
import { useOrgLocal } from "@/features/companies/api/use-organization.local";
import { apiGet } from "@/lib/api/client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface AuditEventRow {
  id: string;
  eventType: string;
  actor: string | null;
  target: string | null;
  createdAt: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Local mode only, org owner/admin only (server-enforced via requireOrgRole
// - see routes/local-auth.ts's /audit-events, and own-auth's own
// view_audit_events permission check underneath it as defense in depth).
export function LocalAuditLog() {
  const { t } = useTranslation("companies");
  const { activeOrg } = useOrgLocal();
  const [events, setEvents] = useState<AuditEventRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canView = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  useEffect(() => {
    if (!activeOrg || !canView) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    apiGet<{ success: boolean; data?: AuditEventRow[] }>(
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
      <p className="text-xs text-muted-foreground">
        {t("auditLog.membersOnly")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("auditLog.description")}</p>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && events?.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("auditLog.empty")}</p>
      )}

      {!isLoading && events && events.length > 0 && (
        <div className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-lg border">
          {events.slice(0, 100).map((event) => (
            <div key={event.id} className="flex items-center gap-3 px-3 py-2 text-xs">
              <span className="flex-1 truncate font-mono">{event.eventType}</span>
              {event.actor && (
                <span className="truncate text-muted-foreground">
                  {event.actor}
                </span>
              )}
              <span className="shrink-0 text-muted-foreground">
                {formatDate(event.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
