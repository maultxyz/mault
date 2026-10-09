import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebhooks } from "@/features/integrations/api/use-webhooks";
import { WebhookDialog } from "@/features/integrations/components/webhook-dialog";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { toast } from "@/lib/toast";
import type { WebhookEndpoint } from "@magic-vault/shared";
import {
  IconCopy,
  IconDots,
  IconPlus,
  IconWebhook,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WebhooksSection() {
  const { t } = useTranslation("integrations");
  const {
    endpoints,
    canManage,
    isLocked,
    isLoading,
    isError,
    create,
    update,
    enable,
    test,
    remove,
  } = useWebhooks();
  const [dialogTarget, setDialogTarget] = useState<
    WebhookEndpoint | "new" | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(
    null,
  );
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const editing = dialogTarget === "new" ? null : dialogTarget;

  function deliveryStatus(endpoint: WebhookEndpoint): string {
    if (!endpoint.lastDeliveryAt) return t("webhooks.neverDelivered");
    const date = formatDateTime(endpoint.lastDeliveryAt);
    return endpoint.lastError
      ? t("webhooks.lastFailed", { date, error: endpoint.lastError })
      : t("webhooks.lastSucceeded", { date, status: endpoint.lastStatus });
  }

  function copySecret() {
    if (!newSecret) return;
    navigator.clipboard
      .writeText(newSecret)
      .then(() => toast.success(t("webhooks.secretCopied")))
      .catch(() => toast.error(t("webhooks.copyFailed")));
  }

  return (
    <SettingsSection
      heading={t("webhooks.heading")}
      description={t("webhooks.description")}
      action={
        canManage &&
        !isLocked && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogTarget("new")}
          >
            <IconPlus />
            {t("webhooks.add")}
          </Button>
        )
      }
    >
      {isLocked && (
        <Callout variant="info">
          {t("webhooks.upgrade")}{" "}
          <Link
            to={SETTINGS_PATHS.billing}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {t("apiKeys.upgradeLink")}
          </Link>
        </Callout>
      )}
      {isError && (
        <Callout variant="error">{t("webhooks.loadFailed")}</Callout>
      )}
      {isLoading && <Skeleton className="h-14 w-full" />}

      {!isLoading && !isError && endpoints.length === 0 && (
        <EmptyState
          size="compact"
          icon={IconWebhook}
          title={t("webhooks.empty")}
        />
      )}

      {!isLoading && endpoints.length > 0 && (
        <div className="flex flex-col divide-y rounded-lg border">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.guid}
              className="flex items-start gap-3 px-3 py-2.5 text-sm"
            >
              <IconWebhook className="mt-0.5 size-4 shrink-0 text-foreground/70" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate font-medium">
                    {endpoint.description || endpoint.url}
                  </p>
                  {!endpoint.isEnabled && (
                    <Badge variant="destructive">
                      {t("webhooks.disabled")}
                    </Badge>
                  )}
                </div>
                {endpoint.description && (
                  <p className="truncate text-xs text-foreground/70">
                    {endpoint.url}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  {endpoint.events.map((event) => (
                    <Badge key={event} variant="outline">
                      {event}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-foreground/70">
                  {endpoint.isEnabled
                    ? deliveryStatus(endpoint)
                    : endpoint.disabledReason}
                </p>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("webhooks.actions")}
                      >
                        <IconDots />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      disabled={!endpoint.isEnabled || test.isPending}
                      onClick={() => test.mutate(endpoint.guid)}
                    >
                      {t("webhooks.sendTest")}
                    </DropdownMenuItem>
                    {!endpoint.isEnabled && (
                      <DropdownMenuItem
                        disabled={enable.isPending}
                        onClick={() => enable.mutate(endpoint.guid)}
                      >
                        {t("webhooks.enable")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setDialogTarget(endpoint)}>
                      {t("webhooks.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(endpoint)}
                    >
                      {t("webhooks.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      <WebhookDialog
        open={dialogTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null);
        }}
        endpoint={editing}
        isSaving={create.isPending || update.isPending}
        onSubmit={(input) => {
          if (editing) {
            update.mutate(
              { guid: editing.guid, input },
              { onSuccess: () => setDialogTarget(null) },
            );
          } else {
            create.mutate(input, {
              onSuccess: (created) => {
                setDialogTarget(null);
                setNewSecret(created.secret);
              },
            });
          }
        }}
      />

      <DynamicDialog
        open={!!newSecret}
        onOpenChange={(open) => {
          if (!open) setNewSecret(null);
        }}
        dismissible={false}
        title={t("webhooks.secretTitle")}
        description={t("webhooks.secretDescription")}
        footer={
          <Button
            type="button"
            className="w-full"
            onClick={() => setNewSecret(null)}
          >
            {t("apiKeys.revealDone")}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
            {newSecret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("webhooks.copySecret")}
            onClick={copySecret}
          >
            <IconCopy />
          </Button>
        </div>
      </DynamicDialog>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("webhooks.deleteConfirmTitle")}
        description={t("webhooks.deleteConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("webhooks.delete")}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.guid);
          setDeleteTarget(null);
        }}
      />
    </SettingsSection>
  );
}
