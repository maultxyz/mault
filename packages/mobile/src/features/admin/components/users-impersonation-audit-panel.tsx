import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { impersonationAuditQueryOptions } from "@/features/admin/api/users-impersonation";
import { formatDateTime } from "@/lib/dates";

export function ImpersonationAuditPanel() {
  const { t, i18n } = useTranslation();
  const auditQuery = useQuery(impersonationAuditQueryOptions);
  const entries = auditQuery.data ?? [];
  const unknownEmail = t("admin.users.audit.unknownUser");

  if (auditQuery.isPending) return <ListSkeleton />;
  if (auditQuery.isError) return <Callout tone="destructive" title={t("admin.users.audit.loadFailed")} />;
  if (entries.length === 0) return <EmptyState icon="clock" title={t("admin.users.audit.empty")} />;

  return (
    <ListGroup>
      {entries.map((entry) => (
        <ListRow
          key={entry.guid}
          title={t("admin.users.audit.entryLabel", {
            admin: entry.adminEmail ?? unknownEmail,
            target: entry.targetEmail ?? unknownEmail,
          })}
          subtitle={
            entry.endedAt
              ? t("admin.users.audit.startedAndEnded", {
                  started: formatDateTime(entry.startedAt, i18n.language),
                  ended: formatDateTime(entry.endedAt, i18n.language),
                })
              : t("admin.users.audit.startedOnly", { started: formatDateTime(entry.startedAt, i18n.language) })
          }
          right={entry.endedAt ? undefined : <Pill tone="success" label={t("admin.users.audit.active")} />}
        />
      ))}
    </ListGroup>
  );
}
