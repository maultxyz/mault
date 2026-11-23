import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  clearOrgServerCaches,
  clearServerCacheEntries,
  serverCachesQueryOptions,
} from "@/features/admin/api/server-caches";
import { ServerCacheKeysDialog } from "@/features/admin/components/server-cache-keys-dialog";
import { clearServerCaches, reloadCardMatchIndex } from "@/lib/api/admin";
import {
  EMPTY_SERVER_CACHE_ORG_FORM,
  SERVER_CACHE_ORG_FORM_ID,
  SERVER_CACHES_QUERY_KEY,
} from "@/lib/constants/admin";
import { toast } from "@/lib/toast";
import { adminCacheOrgFormSchema, type AdminCacheOrgFormValues } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDatabase, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ServerCachesPanel() {
  const { t, i18n } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [openCacheName, setOpenCacheName] = useState<string | null>(null);
  const cachesQuery = useQuery(serverCachesQueryOptions);
  const formatNumber = (value: number) => value.toLocaleString(i18n.language);
  const refreshCaches = () =>
    queryClient.invalidateQueries({ queryKey: SERVER_CACHES_QUERY_KEY });

  const orgForm = useForm<AdminCacheOrgFormValues>({
    resolver: zodResolver(adminCacheOrgFormSchema),
    defaultValues: EMPTY_SERVER_CACHE_ORG_FORM,
  });

  const clearCachesMutation = useMutation({
    mutationFn: clearServerCaches,
    onSuccess: (result) => {
      toast.success(
        t("serverCaches.toasts.cleared", { count: result.data?.clearedCacheCount ?? 0 }),
      );
      void refreshCaches();
    },
    onError: () => toast.error(t("serverCaches.toasts.clearError")),
  });

  const reloadMatchIndexMutation = useMutation({
    mutationFn: reloadCardMatchIndex,
    onSuccess: () => toast.success(t("serverCaches.toasts.matchIndexReloading")),
    onError: () => toast.error(t("serverCaches.toasts.matchIndexError")),
  });

  const clearOneCacheMutation = useMutation({
    mutationFn: (cacheName: string) =>
      clearServerCacheEntries(cacheName, { clearsWholeCache: true }),
    onSuccess: (result, cacheName) => {
      toast.success(
        t("serverCaches.toasts.entriesCleared", {
          count: result.clearedEntryCount,
          name: cacheName,
        }),
      );
      void refreshCaches();
    },
    onError: (_error, cacheName) =>
      toast.error(t("serverCaches.toasts.entriesClearError", { name: cacheName })),
  });

  async function handleClearOrg(values: AdminCacheOrgFormValues) {
    const result = await clearOrgServerCaches(values.orgId).catch(() => null);
    if (!result) {
      toast.error(t("serverCaches.toasts.orgClearError"));
      return;
    }
    toast.success(t("serverCaches.toasts.orgCleared", { count: result.clearedEntryCount }));
    orgForm.reset(EMPTY_SERVER_CACHE_ORG_FORM);
    void refreshCaches();
  }

  return (
    <SettingsSection
      heading={t("serverCaches.heading")}
      description={t("serverCaches.description")}
    >
      <div className="flex flex-col gap-4 md:gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            disabled={clearCachesMutation.isPending}
            onClick={() => clearCachesMutation.mutate()}
          >
            {clearCachesMutation.isPending
              ? t("serverCaches.clearingButton")
              : t("serverCaches.clearButton")}
          </Button>
          <Button
            variant="outline"
            disabled={reloadMatchIndexMutation.isPending}
            onClick={() => reloadMatchIndexMutation.mutate()}
          >
            {reloadMatchIndexMutation.isPending
              ? t("serverCaches.reloadingMatchIndexButton")
              : t("serverCaches.reloadMatchIndexButton")}
          </Button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">
            {t("serverCaches.org.heading")}
          </h3>
          <form
            id={SERVER_CACHE_ORG_FORM_ID}
            className="flex flex-col gap-2 md:flex-row md:items-start md:gap-1.5"
            onSubmit={orgForm.handleSubmit(handleClearOrg)}
          >
            <Field data-invalid={!!orgForm.formState.errors.orgId} className="md:max-w-96">
              <FieldLabel htmlFor="server-cache-org-id" className="sr-only">
                {t("serverCaches.org.idLabel")}
              </FieldLabel>
              <Input
                id="server-cache-org-id"
                placeholder={t("serverCaches.org.idPlaceholder")}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby="server-cache-org-id-description"
                {...orgForm.register("orgId")}
              />
              <FieldDescription id="server-cache-org-id-description">
                {t("serverCaches.org.description")}
              </FieldDescription>
              <FieldError errors={[orgForm.formState.errors.orgId]} />
            </Field>
            <Button
              type="submit"
              variant="outline"
              disabled={orgForm.formState.isSubmitting}
            >
              {t("serverCaches.org.clearButton")}
            </Button>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="font-heading text-sm font-semibold">
              {t("serverCaches.list.heading")}
            </h3>
            <Button
              variant="ghost"
              disabled={cachesQuery.isFetching}
              onClick={() => void cachesQuery.refetch()}
            >
              <IconRefresh />
              {t("serverCaches.list.refresh")}
            </Button>
          </div>
          {cachesQuery.isError ? (
            <LoadErrorCallout
              message={t("serverCaches.list.loadError")}
              onRetry={() => void cachesQuery.refetch()}
            />
          ) : !cachesQuery.data ? (
            <ListSkeleton />
          ) : cachesQuery.data.length === 0 ? (
            <EmptyState
              size="compact"
              icon={IconDatabase}
              title={t("serverCaches.list.empty")}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("serverCaches.list.columns.name")}</TableHead>
                  <TableHead className="text-right">
                    {t("serverCaches.list.columns.entries")}
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">{t("serverCaches.list.columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cachesQuery.data.map((cache) => (
                  <TableRow key={cache.name}>
                    <TableCell className="font-mono text-xs">{cache.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(cache.entryCount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          aria-label={t("serverCaches.list.showKeysLabel", { name: cache.name })}
                          onClick={() => setOpenCacheName(cache.name)}
                        >
                          {t("serverCaches.list.showKeys")}
                        </Button>
                        <Button
                          variant="outline"
                          disabled={cache.entryCount === 0 || clearOneCacheMutation.isPending}
                          aria-label={t("serverCaches.list.clearLabel", { name: cache.name })}
                          onClick={() => clearOneCacheMutation.mutate(cache.name)}
                        >
                          {t("serverCaches.list.clear")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
      <ServerCacheKeysDialog
        cacheName={openCacheName}
        onOpenChange={(open) => {
          if (!open) setOpenCacheName(null);
        }}
      />
    </SettingsSection>
  );
}
