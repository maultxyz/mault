import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { restoreCardCaches } from "@/features/cards/lib/card-list-cache";
import { createStorageLocation, renameStorageLocation } from "@/features/storage/api/storage";
import { renameStorageLocationInCaches } from "@/features/storage/lib/storage-location-cache";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { storageLocationNameFormSchema, type StorageLocationNameFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { CardCachePatchContext } from "@/lib/interfaces/undo";

export default function StorageNameScreen() {
  const { guid, name } = useLocalSearchParams<{ guid?: string; name?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const editing = !!guid;
  const form = useForm<StorageLocationNameFormValues>({
    resolver: zodResolver(storageLocationNameFormSchema),
    defaultValues: { name: name ?? "" },
  });
  const save = useMutation({
    mutationFn: (values: StorageLocationNameFormValues) =>
      editing ? renameStorageLocation(guid, values.name.trim()) : createStorageLocation(values.name.trim()),
    onMutate: async (values): Promise<CardCachePatchContext | undefined> =>
      editing ? { snapshot: await renameStorageLocationInCaches(queryClient, orgId, guid, values.name.trim()) } : undefined,
    onSuccess: () => router.back(),
    onError: (_error, _values, context) => {
      if (context) restoreCardCaches(queryClient, context.snapshot);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["storage-locations"] }),
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={editing ? t("storage.rename") : t("storage.newLocation")} />
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
      </PinnedActionsLayout>
    </View>
  );
}
