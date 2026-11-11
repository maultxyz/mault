import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { deleteStorageLocation } from "@/features/storage/api/storage";
import type { StorageLocationActionsOptions, StorageLocationActionTarget } from "@/lib/interfaces/storage";
import type { OptionItem } from "@/lib/interfaces/ui";

export function useStorageLocationActions({ onDeleted }: StorageLocationActionsOptions = {}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (guid: string) => deleteStorageLocation(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      onDeleted?.();
    },
  });

  const options: OptionItem[] = [
    { value: "share", label: t("storage.share") },
    { value: "rename", label: t("storage.rename") },
    { value: "delete", label: t("storage.delete") },
  ];

  const runAction = (location: StorageLocationActionTarget, action: string) => {
    if (action === "share") {
      router.push({ pathname: "/share-link", params: { kind: "storage", guid: location.guid } });
    } else if (action === "rename") {
      router.push({ pathname: "/storage-name", params: { guid: location.guid, name: location.name } });
    } else if (action === "delete") {
      Alert.alert(t("storage.deleteTitle", { name: location.name }), t("storage.deleteDescription"), [
        { text: t("storage.cancel"), style: "cancel" },
        { text: t("storage.delete"), style: "destructive", onPress: () => remove.mutate(location.guid) },
      ]);
    }
  };

  return { options, runAction, remove };
}
