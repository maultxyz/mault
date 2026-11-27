import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  storageLocationSeriesFormSchema,
  storageLocationSeriesNames,
  type StorageLocationSeriesFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { NumberTextField } from "@/components/ui/number-text-field";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { appendToStoragePlanDraft } from "@/features/rules/lib/storage-plan-draft";
import { createStorageLocationSeries } from "@/features/storage/api/storage";
import { useTheme } from "@/hooks/use-theme";
import { STORAGE_SERIES_DEFAULT_VALUES } from "@/lib/constants/storage";
import { SPACING } from "@/lib/constants/theme";
import { storageSaveErrorMessage } from "@/features/storage/lib/storage-save-error";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function StorageSeriesScreen() {
  const { addToStoragePlan } = useLocalSearchParams<{ addToStoragePlan?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const form = useForm<StorageLocationSeriesFormValues>({
    resolver: zodResolver(storageLocationSeriesFormSchema),
    defaultValues: STORAGE_SERIES_DEFAULT_VALUES,
  });
  const [prefix, firstNumber, count] = form.watch(["prefix", "firstNumber", "count"]);
  const names =
    prefix.trim() && firstNumber != null && count != null && count > 0
      ? storageLocationSeriesNames(prefix, firstNumber, count)
      : [];
  const save = useMutation({
    mutationFn: (values: StorageLocationSeriesFormValues) => createStorageLocationSeries(values),
    onSuccess: (result) => {
      if (addToStoragePlan) appendToStoragePlanDraft(result.created.map((location) => location.guid));
      router.back();
      showToast({
        message:
          result.skippedNames.length > 0
            ? t("storage.series.createdWithSkipped", {
                count: result.created.length,
                names: result.skippedNames.join(", "),
              })
            : t("storage.series.created", { count: result.created.length }),
        tone: "success",
      });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["storage-locations"] }),
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("storage.series.title")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("storage.series.create", { count: names.length })}
            loading={save.isPending}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        <View style={{ gap: SPACING.lg }}>
          {save.isError ? <Callout tone="destructive" title={storageSaveErrorMessage(save.error, t)} /> : null}
          <AppText size="sm" tone="secondary">
            {t("storage.series.description")}
          </AppText>
          <Controller
            control={form.control}
            name="prefix"
            render={({ field, fieldState }) => (
              <TextField
                label={t("storage.series.prefixLabel")}
                placeholder={t("storage.series.prefixPlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                autoCapitalize="none"
                returnKeyType="done"
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="firstNumber"
            render={({ field, fieldState }) => (
              <NumberTextField
                label={t("storage.series.firstNumberLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ?? Number.NaN)}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="count"
            render={({ field, fieldState }) => (
              <NumberTextField
                label={t("storage.series.countLabel")}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(value) => field.onChange(value ?? Number.NaN)}
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
          {names.length > 0 ? (
            <AppText size="sm" accessibilityLiveRegion="polite">
              {names.length === 1
                ? t("storage.series.previewOne", { name: names[0] })
                : t("storage.series.preview", { first: names[0], last: names[names.length - 1], count: names.length })}
            </AppText>
          ) : null}
        </View>
      </PinnedActionsLayout>
    </View>
  );
}
