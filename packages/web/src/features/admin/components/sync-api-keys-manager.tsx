import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSyncApiKeys } from "@/features/admin/api/use-sync-api-keys";
import { syncApiUrl } from "@/features/admin/lib/sync-api-url";
import { copyWithToast } from "@/lib/clipboard";
import { formatShortDate } from "@/lib/format";
import {
  PUBLIC_API_KEY_HEADER,
  SYNC_API_KEY_PERMISSIONS,
  type SyncApiKey,
  syncApiKeyFormSchema,
  type SyncApiKeyFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCopy, IconKey, IconLoader2, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function SyncApiKeysManager() {
  const { t } = useTranslation("admin");
  const { keys, isLoading, isError, create, revoke } = useSyncApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<SyncApiKey | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const form = useForm<SyncApiKeyFormValues>({
    resolver: zodResolver(syncApiKeyFormSchema),
    defaultValues: { name: "", permissions: ["sync_start"] },
  });

  async function handleCreate(values: SyncApiKeyFormValues) {
    const created = await create.mutateAsync(values).catch(() => null);
    if (!created) return;
    form.reset();
    setShowCreate(false);
    setNewRawKey(created.rawKey);
  }

  const exampleCommand = newRawKey
    ? `curl -X POST ${syncApiUrl()}/sync \\\n  -H "${PUBLIC_API_KEY_HEADER}: ${newRawKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"gameKey":"mtg","lang":"en"}'`
    : "";

  return (
    <SettingsSection
      heading={t("syncApiKeys.heading")}
      description={t("syncApiKeys.description")}
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowCreate(true)}
        >
          <IconPlus />
          {t("syncApiKeys.create")}
        </Button>
      }
    >
      {isError && <Callout variant="error">{t("syncApiKeys.loadFailed")}</Callout>}

      {isLoading && <Skeleton className="h-14 w-full" />}

      {!isLoading && !isError && keys.length === 0 && (
        <EmptyState size="compact" icon={IconKey} title={t("syncApiKeys.empty")} />
      )}

      {!isLoading && keys.length > 0 && (
        <div className="flex flex-col divide-y rounded-lg border">
          {keys.map((key) => (
            <div key={key.guid} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <IconKey className="size-4 shrink-0 text-foreground/70" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate font-medium">{key.name}</p>
                <div className="flex flex-wrap gap-1">
                  {key.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {t(`syncApiKeys.permissions.${permission}.label`)}
                    </Badge>
                  ))}
                </div>
                <p className="truncate text-xs text-foreground/70">
                  <code>{key.keyPrefix}···</code>
                  {" · "}
                  {t("syncApiKeys.createdBy", {
                    name: key.createdBy,
                    date: formatShortDate(key.createdAt),
                  })}
                  {" · "}
                  {key.lastUsedAt
                    ? t("syncApiKeys.lastUsed", {
                        date: formatShortDate(key.lastUsedAt),
                      })
                    : t("syncApiKeys.neverUsed")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={revoke.isPending && revoke.variables === key.guid}
                onClick={() => setRevokeTarget(key)}
              >
                {revoke.isPending && revoke.variables === key.guid && (
                  <IconLoader2 className="animate-spin" />
                )}
                {t("syncApiKeys.revoke")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <DynamicDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={t("syncApiKeys.createTitle")}
        description={t("syncApiKeys.createDescription")}
        footer={
          <Button
            type="submit"
            form="create-sync-api-key-form"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("syncApiKeys.create")}
          </Button>
        }
      >
        <form
          id="create-sync-api-key-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleCreate)}
        >
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="sync-api-key-name">
              {t("syncApiKeys.nameLabel")}
            </FieldLabel>
            <Input
              id="sync-api-key-name"
              placeholder={t("syncApiKeys.namePlaceholder")}
              autoFocus
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.permissions}>
            <FieldLabel>{t("syncApiKeys.permissionsLabel")}</FieldLabel>
            <Controller
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <div className="divide-y rounded-lg border">
                  {SYNC_API_KEY_PERMISSIONS.map((permission) => {
                    const id = `sync-api-key-permission-${permission}`;
                    return (
                      <div key={permission} className="flex items-start gap-3 px-3 py-2.5">
                        <Checkbox
                          id={id}
                          checked={field.value.includes(permission)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              SYNC_API_KEY_PERMISSIONS.filter((p) =>
                                p === permission ? checked : field.value.includes(p),
                              ),
                            )
                          }
                          className="mt-0.5"
                        />
                        <label htmlFor={id} className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">
                            {t(`syncApiKeys.permissions.${permission}.label`)}
                          </span>
                          <span className="text-xs text-foreground/70">
                            {t(`syncApiKeys.permissions.${permission}.description`)}
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            <FieldError errors={[form.formState.errors.permissions]} />
          </Field>
        </form>
      </DynamicDialog>

      <DynamicDialog
        open={!!newRawKey}
        onOpenChange={(open) => {
          if (!open) setNewRawKey(null);
        }}
        dismissible={false}
        title={t("syncApiKeys.revealTitle")}
        description={t("syncApiKeys.revealDescription")}
        footer={
          <Button type="button" className="w-full" onClick={() => setNewRawKey(null)}>
            {t("syncApiKeys.revealDone")}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
            <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
              {newRawKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("syncApiKeys.copy")}
              onClick={() =>
                newRawKey &&
                void copyWithToast(
                  newRawKey,
                  t("syncApiKeys.copied"),
                  t("syncApiKeys.copyFailed"),
                )
              }
            >
              <IconCopy />
            </Button>
          </div>
          <p className="text-xs text-foreground/70">{t("syncApiKeys.exampleLabel")}</p>
          <pre className="overflow-x-auto rounded-lg border bg-muted p-2 text-xs">
            {exampleCommand}
          </pre>
        </div>
      </DynamicDialog>

      <DeleteDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t("syncApiKeys.revokeConfirmTitle")}
        description={t("syncApiKeys.revokeConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("syncApiKeys.revoke")}
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget.guid);
          setRevokeTarget(null);
        }}
      />
    </SettingsSection>
  );
}
