import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api/client";
import { localDelete, localPost } from "@/lib/auth/local-api";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCopy, IconKey, IconLoader2, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  status: "active" | "revoked";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const createSchema = z.object({ name: z.string().min(1) });
type CreateValues = z.infer<typeof createSchema>;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Local mode only - see routes/local-auth.ts. Personal API keys (like a
// GitHub personal access token), scriptable access to Mault's own API using
// the same Authorization: Bearer transport a browser session uses.
export function ApiKeysManager() {
  const { t } = useTranslation("account");
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokingPrefix, setRevokingPrefix] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "" },
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data?: ApiKey[] }>(
        "/api/local-auth/api-keys",
      );
      setKeys(res.data ?? []);
    } catch {
      toast.error(t("apiKeys.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate({ name }: CreateValues) {
    try {
      const res = await localPost<{
        success: boolean;
        data?: { apiKey: ApiKey; rawKey: string };
        message?: string;
      }>("/api/local-auth/api-keys", { name: name.trim() });
      if (!res.success || !res.data) {
        throw new Error(res.message ?? t("apiKeys.createFailed"));
      }
      form.reset();
      setShowCreate(false);
      setNewRawKey(res.data.rawKey);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("apiKeys.createFailed"));
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevokingPrefix(revokeTarget.keyPrefix);
    try {
      const res = await localDelete<{ success: boolean; message?: string }>(
        `/api/local-auth/api-keys/${revokeTarget.keyPrefix}`,
      );
      if (!res.success) throw new Error(res.message ?? t("apiKeys.revokeFailed"));
      toast.success(t("apiKeys.revoked"));
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("apiKeys.revokeFailed"));
    } finally {
      setRevokingPrefix(null);
      setRevokeTarget(null);
    }
  }

  function copyNewKey() {
    if (!newRawKey) return;
    navigator.clipboard
      .writeText(newRawKey)
      .then(() => toast.success(t("apiKeys.copied")))
      .catch(() => toast.error(t("apiKeys.copyFailed")));
  }

  const activeKeys = (keys ?? []).filter((k) => k.status === "active");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {t("apiKeys.description")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          <IconPlus size={14} />
          {t("apiKeys.create")}
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {!isLoading && activeKeys.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("apiKeys.empty")}</p>
      )}

      {!isLoading && activeKeys.length > 0 && (
        <div className="flex flex-col divide-y divide-border rounded-lg border">
          {activeKeys.map((key) => {
            const isRevoking = revokingPrefix === key.keyPrefix;
            const expires = formatDate(key.expiresAt);
            return (
              <div
                key={key.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <IconKey className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{key.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {key.keyPrefix}···
                    {expires
                      ? ` · ${t("apiKeys.expires", { date: expires })}`
                      : ` · ${t("apiKeys.noExpiry")}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRevoking}
                  onClick={() => setRevokeTarget(key)}
                >
                  {isRevoking && <IconLoader2 className="animate-spin" />}
                  {t("apiKeys.revoke")}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <DynamicDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title={t("apiKeys.createTitle")}
        description={t("apiKeys.createDescription")}
        footer={
          <Button
            type="submit"
            form="create-api-key-form"
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
          id="create-api-key-form"
          onSubmit={form.handleSubmit(handleCreate)}
        >
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="api-key-name">
              {t("apiKeys.nameLabel")}
            </FieldLabel>
            <Input
              id="api-key-name"
              placeholder={t("apiKeys.namePlaceholder")}
              autoFocus
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
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
          <Button type="button" className="w-full" onClick={() => setNewRawKey(null)}>
            {t("apiKeys.revealDone")}
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border bg-muted p-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap text-xs">
            {newRawKey}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copyNewKey}>
            <IconCopy size={14} />
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
        onConfirm={handleRevoke}
      />
    </div>
  );
}
