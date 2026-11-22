import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatsSyncKey } from "@/features/integrations/api/use-stats-sync";
import { copyWithToast } from "@/lib/clipboard";
import { formatShortDate } from "@/lib/format";
import { IconCopy, IconKey, IconLoader2, IconServer } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StatsSyncKeySection() {
  const { t, i18n } = useTranslation("integrations");
  const { data: status, isLoading, isError, refetch, generate, revoke } =
    useStatsSyncKey();
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "regenerate" | "revoke" | null
  >(null);
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const key = status?.key ?? null;
  const canManage = status?.canManage ?? false;

  async function handleGenerate() {
    const created = await generate.mutateAsync().catch(() => null);
    if (created) setNewRawKey(created.rawKey);
  }

  function copyNewKey() {
    if (!newRawKey) return;
    void copyWithToast(
      newRawKey,
      t("statsSync.key.copied"),
      t("statsSync.key.copyFailed"),
    );
  }

  return (
    <SettingsSection
      heading={t("statsSync.key.heading")}
      description={t("statsSync.key.description")}
      action={
        canManage &&
        !key && (
          <Button
            type="button"
            variant="outline"
            disabled={generate.isPending}
            onClick={() => void handleGenerate()}
          >
            {generate.isPending ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconKey />
            )}
            {t("statsSync.key.generate")}
          </Button>
        )
      }
    >
      {isError && (
        <LoadErrorCallout
          message={t("statsSync.key.loadFailed")}
          onRetry={() => void refetch()}
        />
      )}
      {isLoading && <Skeleton className="h-14 w-full" />}
      {status && !canManage && (
        <Callout variant="neutral">{t("statsSync.key.managersOnly")}</Callout>
      )}
      {status && !key && (
        <Callout variant="neutral" icon={IconServer}>
          {t("statsSync.key.empty")}
        </Callout>
      )}
      {status && key && (
        <div className="flex items-center gap-3 px-3 py-2.5 text-sm max-md:flex-wrap">
          <IconKey className="size-4 shrink-0 text-foreground/70" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-medium">
              <code>{key.keyPrefix}···</code>
            </p>
            <p className="text-xs text-foreground/70">
              {t("statsSync.key.createdBy", {
                name: key.createdBy,
                date: formatShortDate(key.createdAt),
              })}
              {" · "}
              {key.lastSyncedAt
                ? t("statsSync.key.lastSynced", {
                    date: formatShortDate(key.lastSyncedAt),
                  })
                : t("statsSync.key.neverSynced")}
              {" · "}
              {t("statsSync.key.syncedScans", {
                count: status.syncedScanCount,
                formattedCount: numberFormat.format(status.syncedScanCount),
              })}
            </p>
          </div>
          {canManage && (
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                disabled={generate.isPending || revoke.isPending}
                onClick={() => setConfirmAction("regenerate")}
              >
                {generate.isPending && <IconLoader2 className="animate-spin" />}
                {t("statsSync.key.regenerate")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={generate.isPending || revoke.isPending}
                onClick={() => setConfirmAction("revoke")}
              >
                {revoke.isPending && <IconLoader2 className="animate-spin" />}
                {t("statsSync.key.revoke")}
              </Button>
            </div>
          )}
        </div>
      )}

      <DynamicDialog
        open={!!newRawKey}
        onOpenChange={(open) => {
          if (!open) setNewRawKey(null);
        }}
        dismissible={false}
        title={t("statsSync.key.revealTitle")}
        description={t("statsSync.key.revealDescription")}
        footer={
          <Button
            type="button"
            className="w-full"
            onClick={() => setNewRawKey(null)}
          >
            {t("statsSync.key.revealDone")}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg bg-foreground/6 p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
            {newRawKey}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("statsSync.key.copy")}
            onClick={copyNewKey}
          >
            <IconCopy />
          </Button>
        </div>
      </DynamicDialog>

      <DeleteDialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction === "regenerate"
            ? t("statsSync.key.regenerateConfirmTitle")
            : t("statsSync.key.revokeConfirmTitle")
        }
        description={
          confirmAction === "regenerate"
            ? t("statsSync.key.regenerateConfirmDescription")
            : t("statsSync.key.revokeConfirmDescription")
        }
        confirm={{ type: "simple" }}
        confirmLabel={
          confirmAction === "regenerate"
            ? t("statsSync.key.regenerate")
            : t("statsSync.key.revoke")
        }
        onConfirm={() => {
          if (confirmAction === "regenerate") void handleGenerate();
          if (confirmAction === "revoke") revoke.mutate();
          setConfirmAction(null);
        }}
      />
    </SettingsSection>
  );
}
