import { EmptyState } from "@/components/empty-state";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  clearServerCacheEntries,
  serverCacheKeysQueryOptions,
} from "@/features/admin/api/server-caches";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { SERVER_CACHE_KEY_PART_DISPLAY_SEPARATOR, SERVER_CACHES_QUERY_KEY } from "@/lib/constants/admin";
import {
  LIST_SKELETON_TITLE_WIDTH_CLASSES,
  SERVER_CACHE_KEYS_SKELETON_ROWS,
} from "@/lib/constants/skeletons";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { ServerCacheKeysDialogProps } from "@/lib/interfaces/admin";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  ADMIN_CACHE_KEY_PART_SEPARATOR,
  ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH,
  type AdminClearCacheEntriesRequest,
} from "@magic-vault/shared";
import { IconKey, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function displayCacheKey(key: string): string {
  return key.split(ADMIN_CACHE_KEY_PART_SEPARATOR).join(SERVER_CACHE_KEY_PART_DISPLAY_SEPARATOR);
}

export function ServerCacheKeysDialog({
  cacheName,
  onOpenChange,
}: ServerCacheKeysDialogProps) {
  const { t, i18n } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [keyContains, setKeyContains] = useState("");
  const debouncedKeyContains = useDebouncedValue(keyContains.trim(), SEARCH_DEBOUNCE_MS);
  const name = cacheName ?? "";
  const keysQuery = useQuery({
    ...serverCacheKeysQueryOptions(name, debouncedKeyContains),
    enabled: cacheName !== null,
  });
  const formatNumber = (value: number) => value.toLocaleString(i18n.language);

  const clearMutation = useMutation({
    mutationFn: (request: AdminClearCacheEntriesRequest) =>
      clearServerCacheEntries(name, request),
    onSuccess: async (result) => {
      toast.success(
        t("serverCaches.toasts.entriesCleared", { count: result.clearedEntryCount, name }),
      );
      await queryClient.invalidateQueries({ queryKey: SERVER_CACHES_QUERY_KEY });
    },
    onError: () => toast.error(t("serverCaches.toasts.entriesClearError", { name })),
  });

  const page = keysQuery.data;
  const matchingKeyCount = page?.matchingKeyCount ?? 0;

  return (
    <DynamicDialog
      open={cacheName !== null}
      onOpenChange={(open) => {
        if (!open) setKeyContains("");
        onOpenChange(open);
      }}
      title={t("serverCaches.keys.title", { name })}
      description={t("serverCaches.keys.description")}
      footer={
        <div className="flex w-full flex-wrap justify-end gap-1.5">
          {debouncedKeyContains && matchingKeyCount > 0 && (
            <Button
              variant="outline"
              disabled={clearMutation.isPending}
              onClick={() => clearMutation.mutate({ keyContains: debouncedKeyContains })}
            >
              {t("serverCaches.keys.clearMatching", { count: matchingKeyCount })}
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={clearMutation.isPending}
            onClick={() => clearMutation.mutate({ clearsWholeCache: true })}
          >
            {t("serverCaches.keys.clearWholeCache")}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 md:gap-2">
        <Field>
          <FieldLabel htmlFor="server-cache-key-search">
            {t("serverCaches.keys.searchLabel")}
          </FieldLabel>
          <Input
            id="server-cache-key-search"
            type="search"
            value={keyContains}
            maxLength={ADMIN_CACHE_KEY_SEARCH_MAX_LENGTH}
            placeholder={t("serverCaches.keys.searchPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onChange={(event) => setKeyContains(event.target.value)}
          />
        </Field>
        {keysQuery.isError ? (
          <LoadErrorCallout
            message={t("serverCaches.keys.loadError")}
            onRetry={() => void keysQuery.refetch()}
          />
        ) : !page ? (
          <SkeletonStatus className="flex flex-col gap-4 md:gap-2">
            <Skeleton className="h-3 w-32" />
            <div className="flex flex-col divide-y divide-border rounded-lg border">
              {Array.from({ length: SERVER_CACHE_KEYS_SKELETON_ROWS }).map((_, index) => (
                <div key={index} className="flex items-center gap-1.5 px-2 py-1">
                  <div className="min-w-0 flex-1">
                    <Skeleton
                      className={cn(
                        "h-3",
                        LIST_SKELETON_TITLE_WIDTH_CLASSES[index % LIST_SKELETON_TITLE_WIDTH_CLASSES.length],
                      )}
                    />
                  </div>
                  <Skeleton className="size-10 shrink-0 rounded-lg md:size-7" />
                </div>
              ))}
            </div>
          </SkeletonStatus>
        ) : page.keys.length === 0 ? (
          <EmptyState size="compact" icon={IconKey} title={t("serverCaches.keys.empty")} />
        ) : (
          <>
            <p role="status" className="text-xs text-foreground/70">
              {t("serverCaches.keys.shownCount", {
                shown: formatNumber(page.keys.length),
                count: formatNumber(page.matchingKeyCount),
              })}
            </p>
            <ul className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto rounded-lg border">
              {page.keys.map((key) => {
                const shownKey = displayCacheKey(key);
                return (
                  <li key={key} className="flex items-center gap-1.5 px-2 py-1">
                    <span className="min-w-0 flex-1 font-mono text-xs break-all">{shownKey}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={clearMutation.isPending}
                      aria-label={t("serverCaches.keys.deleteKeyLabel", { key: shownKey })}
                      onClick={() => clearMutation.mutate({ keys: [key] })}
                    >
                      <IconTrash />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </DynamicDialog>
  );
}
