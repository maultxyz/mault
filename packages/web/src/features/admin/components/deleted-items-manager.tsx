import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deletedItemsQueryOptions,
  restoreDeletedItem,
} from "@/features/admin/api/deleted-items";
import {
  ALL_DELETED_ITEM_TYPES,
  DELETED_ITEM_TYPE_FILTERS,
} from "@/lib/constants/admin";
import type { DeletedItemTypeFilter } from "@/lib/interfaces/admin";
import { toast } from "@/lib/toast";
import type { DeletedItem } from "@magic-vault/shared";
import { IconLoader2, IconRestore, IconTrashOff } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function DeletedItemsManager() {
  const { t, i18n } = useTranslation("admin");
  const queryClient = useQueryClient();
  const itemsQuery = useQuery(deletedItemsQueryOptions);
  const [typeFilter, setTypeFilter] = useState<DeletedItemTypeFilter>(
    ALL_DELETED_ITEM_TYPES,
  );
  const [search, setSearch] = useState("");

  const restoreMutation = useMutation({
    mutationFn: (item: DeletedItem) => restoreDeletedItem(item.type, item.guid),
    onSuccess: (r, item) => {
      if (!r.success) {
        toast.error(r.message || t("deletedItems.toasts.restoreError"));
        return;
      }
      queryClient.invalidateQueries();
      toast.success(t("deletedItems.toasts.restored", { name: item.name }));
    },
    onError: () => toast.error(t("deletedItems.toasts.restoreError")),
  });

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (itemsQuery.data ?? []).filter(
      (item) =>
        (typeFilter === ALL_DELETED_ITEM_TYPES || item.type === typeFilter) &&
        (!query ||
          [item.name, item.detail, item.orgName]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(query))),
    );
  }, [itemsQuery.data, typeFilter, search]);

  const typeLabel = (type: DeletedItemTypeFilter) =>
    type === ALL_DELETED_ITEM_TYPES
      ? t("deletedItems.allTypes")
      : t(`deletedItems.types.${type}`);

  return (
    <SettingsSection
      heading={t("deletedItems.heading")}
      description={t("deletedItems.description")}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("deletedItems.searchPlaceholder")}
          data-hotkey-search
        />
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as DeletedItemTypeFilter)
          }
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>{typeLabel(typeFilter)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DELETED_ITEM_TYPE_FILTERS.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {itemsQuery.isLoading ? (
        <ListSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconTrashOff}
          title={t("deletedItems.empty")}
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => {
            const restoring =
              restoreMutation.isPending &&
              restoreMutation.variables?.guid === item.guid;
            return (
              <div
                key={`${item.type}-${item.guid}`}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <Badge variant="outline" className="shrink-0">
                      {typeLabel(item.type)}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-foreground/70">
                    {[
                      item.detail,
                      item.orgName ?? t("deletedItems.global"),
                      t("deletedItems.lastUpdated", {
                        date: new Date(item.updatedAt).toLocaleString(
                          i18n.language,
                          { dateStyle: "medium", timeStyle: "short" },
                        ),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => restoreMutation.mutate(item)}
                  disabled={restoreMutation.isPending}
                >
                  {restoring ? (
                    <IconLoader2 className="animate-spin" />
                  ) : (
                    <IconRestore />
                  )}
                  {t("deletedItems.restore")}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}
