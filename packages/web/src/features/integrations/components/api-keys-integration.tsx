import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useOrgApiKeys } from "@/features/integrations/api/use-org-api-keys";
import { PUBLIC_API_DOCS_URL } from "@/lib/constants/links";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { toast } from "@/lib/toast";
import {
  orgApiKeySchema,
  type OrgApiKeyFormValues,
} from "@/schemas/org-api-key.schema";
import type { OrgApiKey } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconApi,
  IconCopy,
  IconExternalLink,
  IconKey,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ApiKeysIntegration() {
  const { t } = useTranslation("integrations");
  const { keys, canManage, isLocked, isLoading, isError, create, revoke } =
    useOrgApiKeys();
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<OrgApiKey | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const form = useForm<OrgApiKeyFormValues>({
    resolver: zodResolver(orgApiKeySchema),
    defaultValues: { name: "", allowWrite: false },
  });

  async function handleCreate(values: OrgApiKeyFormValues) {
    const created = await create
      .mutateAsync({
        name: values.name,
        scope: values.allowWrite ? "read_write" : "read",
      })
      .catch(() => null);
    if (!created) return;
    form.reset();
    setShowCreate(false);
    setNewRawKey(created.rawKey);
  }

  function copyNewKey() {
    if (!newRawKey) return;
    navigator.clipboard
      .writeText(newRawKey)
      .then(() => toast.success(t("apiKeys.copied")))
      .catch(() => toast.error(t("apiKeys.copyFailed")));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <IconApi size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold">
            {t("api.heading")}
          </h2>
          <p className="truncate text-sm text-foreground/70">
            {t("api.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <a
              href={PUBLIC_API_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          {t("apiKeys.docs")}
          <IconExternalLink />
        </Button>
      </div>

      <SettingsSections>
        <SettingsSection
          heading={t("apiKeys.heading")}
          description={t("apiKeys.description")}
          action={
            canManage &&
            !isLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(true)}
              >
                <IconPlus />
                {t("apiKeys.create")}
              </Button>
            )
          }
        >
          {isLocked && (
            <Callout variant="info">
              {t("apiKeys.upgrade")}{" "}
              <Link
                to={SETTINGS_PATHS.billing}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t("apiKeys.upgradeLink")}
              </Link>
            </Callout>
          )}
          {!canManage && !isLoading && !isError && (
            <Callout variant="neutral">{t("apiKeys.managersOnly")}</Callout>
          )}
          {isError && (
            <Callout variant="error">{t("apiKeys.loadFailed")}</Callout>
          )}

          {isLoading && <Skeleton className="h-14 w-full" />}

          {!isLoading && !isError && keys.length === 0 && (
            <EmptyState
              size="compact"
              icon={IconKey}
              title={t("apiKeys.empty")}
            />
          )}

          {!isLoading && keys.length > 0 && (
            <div className="flex flex-col divide-y rounded-lg border">
              {keys.map((key) => (
                <div
                  key={key.guid}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <IconKey className="size-4 shrink-0 text-foreground/70" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium">{key.name}</p>
                      <Badge variant="outline">
                        {key.scope === "read_write"
                          ? t("apiKeys.readWrite")
                          : t("apiKeys.readOnly")}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-foreground/70">
                      <code>{key.keyPrefix}···</code>
                      {" · "}
                      {t("apiKeys.createdBy", {
                        name: key.createdBy,
                        date: formatDate(key.createdAt),
                      })}
                      {" · "}
                      {key.lastUsedAt
                        ? t("apiKeys.lastUsed", {
                            date: formatDate(key.lastUsedAt),
                          })
                        : t("apiKeys.neverUsed")}
                    </p>
                  </div>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={
                        revoke.isPending && revoke.variables === key.guid
                      }
                      onClick={() => setRevokeTarget(key)}
                    >
                      {revoke.isPending && revoke.variables === key.guid && (
                        <IconLoader2 className="animate-spin" />
                      )}
                      {t("apiKeys.revoke")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SettingsSection>
      </SettingsSections>

      <DynamicDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={t("apiKeys.createTitle")}
        description={t("apiKeys.createDescription")}
        footer={
          <Button
            type="submit"
            form="create-org-api-key-form"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin" />
            )}
            {t("apiKeys.create")}
          </Button>
        }
      >
        <form
          id="create-org-api-key-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleCreate)}
        >
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="org-api-key-name">
              {t("apiKeys.nameLabel")}
            </FieldLabel>
            <Input
              id="org-api-key-name"
              placeholder={t("apiKeys.namePlaceholder")}
              autoFocus
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="org-api-key-write">
                {t("apiKeys.writeLabel")}
              </FieldLabel>
              <FieldDescription>
                {t("apiKeys.writeDescription")}
              </FieldDescription>
            </FieldContent>
            <Controller
              control={form.control}
              name="allowWrite"
              render={({ field }) => (
                <Switch
                  id="org-api-key-write"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>
        </form>
      </DynamicDialog>

      <DynamicDialog
        open={!!newRawKey}
        onOpenChange={(open) => {
          if (!open) setNewRawKey(null);
        }}
        dismissible={false}
        title={t("apiKeys.revealTitle")}
        description={t("apiKeys.revealDescription")}
        footer={
          <Button
            type="button"
            className="w-full"
            onClick={() => setNewRawKey(null)}
          >
            {t("apiKeys.revealDone")}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-sm">
            {newRawKey}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("apiKeys.copy")}
            onClick={copyNewKey}
          >
            <IconCopy />
          </Button>
        </div>
      </DynamicDialog>

      <DeleteDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={t("apiKeys.revokeConfirmTitle")}
        description={t("apiKeys.revokeConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("apiKeys.revoke")}
        onConfirm={() => {
          if (revokeTarget) revoke.mutate(revokeTarget.guid);
          setRevokeTarget(null);
        }}
      />
    </div>
  );
}
