import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import type { BinSet } from "@magic-vault/shared";
import { useToast } from "@/components/ui/toast-provider";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { setFillStorageLocations } from "@/features/rules/api/bin-sets";
import { bulkDeleteStorageLocations } from "@/features/storage/api/storage";
import { useStoragePlanUses } from "@/features/storage/api/use-storage-plan-uses";
import { useActiveOrgId } from "@/hooks/use-org";
import type { StorageBulkActionsOptions, StoragePlanBulkInput } from "@/lib/interfaces/storage";

export function useStorageBulkActions({ selectedGuids, onFinished }: StorageBulkActionsOptions) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { presetNamesUsing } = useStoragePlanUses();

  const refreshCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
    void queryClient.invalidateQueries({ queryKey: binSetsQueryOptions(orgId).queryKey });
  };

  const remove = useMutation({
    mutationFn: () => bulkDeleteStorageLocations(selectedGuids),
    onSuccess: (result) => {
      onFinished();
      showToast({ message: t("storage.bulk.deleted", { count: result.updated }), tone: "success" });
    },
    onError: () => showToast({ message: t("storage.actionFailed"), tone: "destructive" }),
    onSettled: refreshCaches,
  });

  const plan = useMutation({
    mutationFn: ({ presetGuid, mode }: StoragePlanBulkInput) => {
      const preset = queryClient
        .getQueryData<BinSet[]>(binSetsQueryOptions(orgId).queryKey)
        ?.find((set) => set.guid === presetGuid);
      const current = preset?.fillStorageLocationGuids ?? [];
      const next =
        mode === "add"
          ? [...current, ...selectedGuids.filter((guid) => !current.includes(guid))]
          : current.filter((guid) => !selectedGuids.includes(guid));
      return setFillStorageLocations(presetGuid, next);
    },
    onSuccess: (sets, { presetGuid, mode }) => {
      queryClient.setQueryData(binSetsQueryOptions(orgId).queryKey, sets);
      const presetName = sets.find((set) => set.guid === presetGuid)?.name ?? "";
      onFinished();
      showToast({
        message:
          mode === "add"
            ? t("storage.bulk.addedToPlan", { count: selectedGuids.length, preset: presetName })
            : t("storage.bulk.removedFromPlan", { count: selectedGuids.length, preset: presetName }),
        tone: "success",
      });
    },
    onError: () => showToast({ message: t("storage.actionFailed"), tone: "destructive" }),
    onSettled: refreshCaches,
  });

  const confirmDelete = () => {
    const presetNames = presetNamesUsing(selectedGuids);
    Alert.alert(
      t("storage.bulk.deleteTitle", { count: selectedGuids.length }),
      [
        t("storage.bulk.deleteDescription"),
        ...(presetNames.length > 0
          ? [t("storage.bulk.deleteInPlans", { presets: presetNames.join(", ") })]
          : []),
      ].join("\n\n"),
      [
        { text: t("storage.cancel"), style: "cancel" },
        { text: t("storage.delete"), style: "destructive", onPress: () => remove.mutate() },
      ],
    );
  };

  return { confirmDelete, remove, plan };
}
