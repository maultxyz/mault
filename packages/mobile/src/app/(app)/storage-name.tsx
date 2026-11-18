import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { NumberTextField } from "@/components/ui/number-text-field";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { restoreCardCaches } from "@/features/cards/lib/card-list-cache";
import {
  cachedStorageLocation,
  createStorageLocation,
  storageLocationQueryOptions,
  updateStorageLocation,
} from "@/features/storage/api/storage";
import { patchStorageLocationInCaches } from "@/features/storage/lib/storage-location-cache";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { storageLocationNameFormSchema, type StorageLocationNameFormValues } from "@magic-vault/shared";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { CardCachePatchContext } from "@/lib/interfaces/undo";

export default function StorageNameScreen() {
  const { guid, name } = useLocalSearchParams<{ guid?: string; name?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const editing = !!guid;
  const location = useQuery({
    ...storageLocationQueryOptions(guid ?? ""),
    enabled: editing,
    placeholderData: () => (guid ? cachedStorageLocation(queryClient, orgId, guid) : undefined),
  });
  const serverValues = useMemo<StorageLocationNameFormValues | undefined>(
    () =>
      location.data
        ? {
            name: location.data.name,
            capacity: location.data.capacity ?? null,
            batchSize: location.data.batchSize ?? null,
          }
        : undefined,
    [location.data],
  );
  const form = useForm<StorageLocationNameFormValues>({
    resolver: zodResolver(storageLocationNameFormSchema),
    defaultValues: { name: name ?? "", capacity: null, batchSize: null },
    values: serverValues,
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    mutationFn: (values: StorageLocationNameFormValues) => {
      const input = { ...values, name: values.name.trim() };
      return editing ? updateStorageLocation(guid, input) : createStorageLocation(input);
    },
    onMutate: async (values): Promise<CardCachePatchContext | undefined> =>
      editing
        ? {
            snapshot: await patchStorageLocationInCaches(queryClient, orgId, guid, {
              name: values.name.trim(),
              capacity: values.capacity,
              batchSize: values.batchSize,
            }),
          }
        : undefined,
    onSuccess: () => router.back(),
    onError: (_error, _values, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      void queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={editing ? t("storage.edit") : t("storage.newLocation")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={editing ? t("storage.save") : t("storage.create")}
            loading={save.isPending}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        <View style={{ gap: SPACING.lg }}>
          {save.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label={t("storage.nameLabel")}
                placeholder={t("storage.namePlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                returnKeyType="done"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
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
          <AppText size="xs" tone="secondary">
            {t("storage.sizeHint")}
          </AppText>
        </View>
      </PinnedActionsLayout>
    </View>
  );
}
