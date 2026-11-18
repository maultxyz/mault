import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { NumberTextField } from "@/components/ui/number-text-field";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SwitchRow } from "@/components/ui/switch-row";
import { useToast } from "@/components/ui/toast-provider";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { bulkUpdateStorageLocations } from "@/features/storage/api/storage";
import { readStorageSelection } from "@/features/storage/lib/storage-selection-store";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { STORAGE_BULK_SIZE_DEFAULT_VALUES } from "@/lib/constants/storage";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import {
  storageLocationBulkSizesFormSchema,
  type StorageLocationBulkSizesFormValues as StorageBulkSizeFormValues,
} from "@magic-vault/shared";

export default function StorageBulkSizeScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [locationGuids] = useState(readStorageSelection);
  const form = useForm<StorageBulkSizeFormValues>({
    resolver: zodResolver(storageLocationBulkSizesFormSchema),
    defaultValues: STORAGE_BULK_SIZE_DEFAULT_VALUES,
  });
  const [changesCapacity, changesBatchSize] = form.watch(["changesCapacity", "changesBatchSize"]);
  const save = useMutation({
    mutationFn: (values: StorageBulkSizeFormValues) =>
      bulkUpdateStorageLocations({
        locationGuids,
        ...(values.changesCapacity ? { capacity: values.capacity } : {}),
        ...(values.changesBatchSize ? { batchSize: values.batchSize } : {}),
      }),
    onSuccess: (result) => {
      router.back();
      showToast({ message: t("storage.bulk.sizeUpdated", { count: result.updated }), tone: "success" });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      void queryClient.invalidateQueries({ queryKey: binSetsQueryOptions(orgId).queryKey });
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("storage.bulk.sizeTitle", { count: locationGuids.length })} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("storage.bulk.sizeApply", { count: locationGuids.length })}
            disabled={(!changesCapacity && !changesBatchSize) || locationGuids.length === 0}
            loading={save.isPending}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        <View style={{ gap: SPACING.lg }}>
          {save.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
          <AppText size="sm" tone="secondary">
            {t("storage.bulk.sizeDescription")}
          </AppText>
          <ListGroup>
            <Controller
              control={form.control}
              name="changesCapacity"
              render={({ field }) => (
                <SwitchRow title={t("storage.bulk.changeCapacity")} value={field.value} onValueChange={field.onChange} />
              )}
            />
            <Controller
              control={form.control}
              name="changesBatchSize"
              render={({ field }) => (
                <SwitchRow title={t("storage.bulk.changeBatchSize")} value={field.value} onValueChange={field.onChange} />
              )}
            />
          </ListGroup>
          {changesCapacity ? (
            <Controller
              control={form.control}
              name="capacity"
              render={({ field, fieldState }) => (
                <NumberTextField
                  label={t("storage.capacityLabel")}
                  placeholder={t("storage.capacityPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
          ) : null}
          {changesBatchSize ? (
            <Controller
              control={form.control}
              name="batchSize"
              render={({ field, fieldState }) => (
                <NumberTextField
                  label={t("storage.batchSizeLabel")}
                  placeholder={t("storage.batchSizePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
          ) : null}
          <AppText size="xs" tone="secondary">
            {t("storage.bulk.sizeClearHint")}
          </AppText>
        </View>
      </PinnedActionsLayout>
    </View>
  );
}
