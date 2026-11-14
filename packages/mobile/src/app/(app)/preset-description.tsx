import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { presetDescriptionFormSchema, type BinSet, type PresetDescriptionFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { updateBinSetDetails } from "@/features/rules/api/bin-sets";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { PresetDescriptionRouteParams, PresetDescriptionSaveContext } from "@/lib/interfaces/rules";

export default function PresetDescriptionScreen() {
  const { guid } = useLocalSearchParams<PresetDescriptionRouteParams>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const setsQuery = binSetsQueryOptions(orgId);
  const { data: sets } = useQuery(setsQuery);
  const preset = sets?.find((set) => set.guid === guid);
  const form = useForm<PresetDescriptionFormValues>({
    resolver: zodResolver(presetDescriptionFormSchema),
    values: { description: preset?.description ?? "" },
  });
  const save = useMutation({
    mutationFn: (values: PresetDescriptionFormValues) =>
      updateBinSetDetails(guid, preset?.name ?? "", values.description.trim()),
    onMutate: async (values): Promise<PresetDescriptionSaveContext> => {
      await queryClient.cancelQueries({ queryKey: setsQuery.queryKey });
      const previous = queryClient.getQueryData<BinSet[]>(setsQuery.queryKey);
      if (previous) {
        queryClient.setQueryData(
          setsQuery.queryKey,
          previous.map((set) => (set.guid === guid ? { ...set, description: values.description.trim() } : set)),
        );
      }
      return { previous };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(setsQuery.queryKey, next);
      router.back();
    },
    onError: (_error, _values, context) => {
      if (context?.previous) queryClient.setQueryData(setsQuery.queryKey, context.previous);
    },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("rules.description.title")} subtitle={preset?.name} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("rules.description.save")}
            loading={save.isPending}
            disabled={!preset}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        {save.isError ? <Callout tone="destructive" title={t("rules.description.saveFailed")} /> : null}
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              label={t("rules.description.label")}
              placeholder={t("rules.description.placeholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              multiline
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
