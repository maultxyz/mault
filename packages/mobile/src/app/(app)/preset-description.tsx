import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { presetDetailsFormSchema, type PresetDetailsFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { MultilineFieldSkeleton } from "@/components/ui/multiline-field-skeleton";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import {
  copyActiveBinSet,
  createBinSet,
  isBinSetNameAvailable,
  updateBinSetDetails,
} from "@/features/rules/api/bin-sets";
import {
  createPresetWorkflow,
  presetWorkflowsQueryOptions,
  renamePresetWorkflow,
} from "@/features/rules/api/preset-workflows";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SPACING } from "@/lib/constants/theme";
import type { PresetDescriptionRouteParams } from "@/lib/interfaces/rules";

export default function PresetDetailsScreen() {
  const { guid, mode, gameGuid } = useLocalSearchParams<PresetDescriptionRouteParams>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const setsQuery = binSetsQueryOptions(orgId);
  const { data: sets, isLoading: isLoadingSets } = useQuery(setsQuery);
  const isWorkflow = mode === "workflow" || mode === "workflowRename";
  const workflowsQuery = presetWorkflowsQueryOptions(orgId);
  const { data: workflows } = useQuery({ ...workflowsQuery, enabled: mode === "workflowRename" });
  const workflow = mode === "workflowRename" ? workflows?.find((candidate) => candidate.guid === guid) : undefined;
  const preset = guid && !isWorkflow ? sets?.find((set) => set.guid === guid) : undefined;
  const isNewPreset = mode === "new" || mode === "copy" || mode === "workflow";
  const presetGameGuid = isNewPreset ? gameGuid || undefined : (preset?.game?.guid ?? undefined);
  const form = useForm<PresetDetailsFormValues>({
    resolver: zodResolver(presetDetailsFormSchema),
    values: { name: preset?.name ?? workflow?.name ?? "", description: preset?.description ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const save = useMutation({
    mutationFn: async (values: PresetDetailsFormValues) => {
      const name = values.name.trim();
      if (mode === "workflow" || mode === "workflowRename") {
        const nextWorkflows =
          mode === "workflow"
            ? await createPresetWorkflow(name, guid ?? "", presetGameGuid)
            : await renamePresetWorkflow(guid ?? "", name);
        queryClient.setQueryData(workflowsQuery.queryKey, nextWorkflows);
        return sets ?? queryClient.fetchQuery(setsQuery);
      }
      if (!(await isBinSetNameAvailable(name, presetGameGuid, preset?.guid))) return null;
      if (mode === "new") return createBinSet(name, presetGameGuid);
      if (mode === "copy") return copyActiveBinSet(name, presetGameGuid);
      return updateBinSetDetails(guid ?? "", name, values.description.trim());
    },
    onSuccess: (next) => {
      if (!next) {
        form.setError("name", { message: t("rules.presetDetails.nameTaken") });
        return;
      }
      queryClient.setQueryData(setsQuery.queryKey, next);
      void queryClient.invalidateQueries({ queryKey: presetWorkflowsQueryOptions(orgId).queryKey });
      router.back();
    },
  });

  const title =
    mode === "workflow"
      ? t("rules.stages.newTitle")
      : mode === "workflowRename"
        ? t("rules.stages.rename")
        : mode === "new"
      ? t("rules.presetDetails.newTitle")
      : mode === "copy"
        ? t("rules.presetDetails.copyTitle")
        : t("rules.presetDetails.editTitle");

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={title} subtitle={isNewPreset ? undefined : preset?.name} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={isNewPreset ? t("rules.presetDetails.create") : t("rules.description.save")}
            loading={save.isPending}
            disabled={mode === "workflowRename" ? !workflow : !isNewPreset && !preset}
            onPress={form.handleSubmit((values) => save.mutate(values))}
          />
        }
      >
        {save.isError ? <Callout tone="destructive" title={t("rules.presetDetails.saveFailed")} /> : null}
        {mode === "workflow" ? (
          <Callout tone="info" title={t("rules.stages.newDescription")} />
        ) : null}
        {!isNewPreset && !isWorkflow && isLoadingSets ? (
          <MultilineFieldSkeleton />
        ) : (
          <View style={{ gap: SPACING.lg }}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("rules.presetDetails.nameLabel")}
                  placeholder={t("rules.presetDetails.namePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            {isNewPreset || isWorkflow ? null : (
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
            )}
          </View>
        )}
      </PinnedActionsLayout>
    </View>
  );
}
