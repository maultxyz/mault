import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { collectionsQueryOptions, deleteCollection, emptyCollection } from "@/features/collections/api/collections";
import { useScanTarget } from "@/features/collections/api/use-scan-target";
import { useActiveShareLinkCount } from "@/features/share-links/api/use-active-share-link-count";
import { useActiveOrgId } from "@/hooks/use-org";
import type { CollectionActionsOptions, CollectionActionTarget } from "@/lib/interfaces/collections";
import type { OptionItem } from "@/lib/interfaces/ui";

export function useCollectionActions({ includesScanInto = false, onDeleted, shareLinkCountGuid }: CollectionActionsOptions = {}) {
  const { t } = useTranslation();
  const activeShareLinkCount = useActiveShareLinkCount(shareLinkCountGuid);
  const queryClient = useQueryClient();
  const collectionsOptions = collectionsQueryOptions(useActiveOrgId());
  const { setScanTargetGuid } = useScanTarget();
  const empty = useMutation({
    mutationFn: (guid: string) => emptyCollection(guid),
    onSuccess: (_result, guid) => {
      void queryClient.invalidateQueries({ queryKey: ["collection-cards", guid] });
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: collectionsOptions.queryKey });
    },
  });
  const remove = useMutation({
    mutationFn: (guid: string) => deleteCollection(guid),
    onSuccess: (next) => {
      queryClient.setQueryData(collectionsOptions.queryKey, next);
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      onDeleted?.();
    },
  });

  const options: OptionItem[] = [
    ...(includesScanInto ? [{ value: "scanInto", label: t("collections.scanInto") }] : []),
    {
      value: "share",
      label: activeShareLinkCount > 0
        ? t("collections.shareLinkWithCount", { count: activeShareLinkCount })
        : t("collections.shareLink"),
    },
    { value: "edit", label: t("collections.edit") },
    { value: "empty", label: t("collections.empty") },
    { value: "delete", label: t("collections.delete") },
  ];

  const runAction = (collection: CollectionActionTarget, action: string) => {
    if (action === "scanInto") {
      setScanTargetGuid(collection.guid);
      router.navigate("/scan");
    } else if (action === "edit") {
      router.push({ pathname: "/collection-edit", params: { guid: collection.guid } });
    } else if (action === "share") {
      router.push({ pathname: "/share-link", params: { kind: "collection", guid: collection.guid } });
    } else if (action === "empty") {
      Alert.alert(t("collections.empty"), t("collections.emptyDescription", { name: collection.name }), [
        { text: t("collections.cancel"), style: "cancel" },
        { text: t("collections.emptyConfirm"), style: "destructive", onPress: () => empty.mutate(collection.guid) },
      ]);
    } else if (action === "delete") {
      Alert.alert(t("collections.delete"), t("collections.deleteDescription", { name: collection.name }), [
        { text: t("collections.cancel"), style: "cancel" },
        { text: t("collections.deleteConfirm"), style: "destructive", onPress: () => remove.mutate(collection.guid) },
      ]);
    }
  };

  return { options, runAction, empty, remove };
}
