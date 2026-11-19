import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatsSyncConnection } from "@/features/integrations/api/use-stats-sync";
import { formatShortDateTime } from "@/lib/format";
import {
  statsSyncConnectFormSchema,
  type StatsSyncConnectFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlertTriangle,
  IconCloudUpload,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StatsSyncConnectionSection() {
  const { t, i18n } = useTranslation("integrations");
  const {
    data: status,
    isLoading,
    isError,
    refetch,
    connect,
    syncNow,
    disconnect,
  } = useStatsSyncConnection();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const numberFormat = new Intl.NumberFormat(i18n.language);
  const connection = status?.connection ?? null;
  const canManage = status?.canManage ?? false;
  const form = useForm<StatsSyncConnectFormValues>({
    resolver: zodResolver(statsSyncConnectFormSchema),
    defaultValues: { syncKey: "" },
  });

  async function handleConnect(values: StatsSyncConnectFormValues) {
    const connected = await connect.mutateAsync(values).catch(() => null);
    if (connected) form.reset();
  }

  return (
    <SettingsSection
      heading={t("statsSync.connection.heading")}
      description={t("statsSync.connection.description", {
        url: status?.targetUrl ?? "",
      })}
      action={
        canManage &&
        connection && (
          <Button
            type="button"
            variant="outline"
            disabled={syncNow.isPending}
            onClick={() => syncNow.mutate()}
          >
            {syncNow.isPending ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconRefresh />
            )}
            {t("statsSync.connection.syncNow")}
          </Button>
        )
      }
    >
      {isError && (
        <LoadErrorCallout
          message={t("statsSync.connection.loadFailed")}
          onRetry={() => void refetch()}
        />
      )}
      {isLoading && <Skeleton className="h-14 w-full" />}
      {status && !canManage && (
        <Callout variant="neutral">
          {t("statsSync.connection.managersOnly")}
        </Callout>
      )}

      {status && !connection && canManage && (
        <form
          className="flex flex-col gap-3 md:gap-2"
          onSubmit={form.handleSubmit(handleConnect)}
        >
          <Field data-invalid={!!form.formState.errors.syncKey}>
            <FieldLabel htmlFor="stats-sync-key">
              {t("statsSync.connection.keyLabel")}
            </FieldLabel>
            <Input
              id="stats-sync-key"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("statsSync.connection.keyPlaceholder")}
              {...form.register("syncKey")}
            />
            <FieldDescription>
              {t("statsSync.connection.keyDescription")}
            </FieldDescription>
            <FieldError errors={[form.formState.errors.syncKey]} />
          </Field>
          {connect.isError && (
            <div role="alert">
              <Callout variant="error" icon={IconAlertTriangle}>
                {t("statsSync.connection.connectFailed")}
              </Callout>
            </div>
          )}
          <div>
            <Button type="submit" disabled={connect.isPending}>
              {connect.isPending ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconCloudUpload />
              )}
              {t("statsSync.connection.connect")}
            </Button>
          </div>
        </form>
      )}

      {status && !connection && !canManage && (
        <Callout variant="neutral">{t("statsSync.connection.notConnected")}</Callout>
      )}

      {connection && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2.5 text-sm max-md:flex-wrap">
            <IconCloudUpload className="size-4 shrink-0 text-foreground/70" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate font-medium">
                <code>{connection.keyPrefix}···</code>
              </p>
              <p className="text-xs text-foreground/70" role="status">
                {connection.lastSyncedAt
                  ? t("statsSync.connection.lastSynced", {
                      date: formatShortDateTime(connection.lastSyncedAt),
                    })
                  : t("statsSync.connection.neverSynced")}
                {connection.syncedScanCount !== null && (
                  <>
                    {" · "}
                    {t("statsSync.connection.syncedScans", {
                      count: connection.syncedScanCount,
                      formattedCount: numberFormat.format(
                        connection.syncedScanCount,
                      ),
                    })}
                  </>
                )}
              </p>
            </div>
            {canManage && (
              <Button
                type="button"
                variant="ghost"
                disabled={disconnect.isPending}
                onClick={() => setConfirmDisconnect(true)}
              >
                {disconnect.isPending && <IconLoader2 className="animate-spin" />}
                {t("statsSync.connection.disconnect")}
              </Button>
            )}
          </div>
          {connection.lastErrorCode && (
            <div role="alert">
              <Callout variant="error" icon={IconAlertTriangle}>
                {t(`statsSync.connection.errors.${connection.lastErrorCode}`)}
              </Callout>
            </div>
          )}
        </div>
      )}

      <DeleteDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={t("statsSync.connection.disconnectConfirmTitle")}
        description={t("statsSync.connection.disconnectConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("statsSync.connection.disconnect")}
        onConfirm={() => {
          disconnect.mutate();
          setConfirmDisconnect(false);
        }}
      />
    </SettingsSection>
  );
}
