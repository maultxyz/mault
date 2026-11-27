import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { orgApiKeyFormSchema, type OrgApiKeyFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { SecretReveal } from "@/features/integrations/components/secret-reveal";
import { useDiscardChangesGuard } from "@/features/settings/lib/use-leave-guard";
import { createApiKey } from "@/features/integrations/api/api-keys";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function NewApiKeyScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const [rawKey, setRawKey] = useState<string | null>(null);
  const form = useForm<OrgApiKeyFormValues>({
    resolver: zodResolver(orgApiKeyFormSchema),
    defaultValues: { name: "", allowWrite: false },
  });
  useDiscardChangesGuard(form.formState.isDirty && !rawKey);
  const create = useMutation({
    mutationFn: (values: OrgApiKeyFormValues) =>
      createApiKey({ name: values.name.trim(), scope: values.allowWrite ? "read_write" : "read" }),
    onSuccess: (created) => {
      setRawKey(created.rawKey);
      AccessibilityInfo.announceForAccessibility(t("settings.apiKeys.revealTitle"));
      void queryClient.invalidateQueries({ queryKey: ["api-keys", orgId] });
    },
  });

  if (rawKey) {
    return (
      <SecretReveal
        title={t("settings.apiKeys.revealTitle")}
        subtitle={org?.name}
        description={t("settings.apiKeys.revealDescription")}
        secret={rawKey}
        copyLabel={t("settings.apiKeys.copy")}
        copiedLabel={t("settings.apiKeys.copied")}
        copyFailedLabel={t("settings.apiKeys.copyFailed")}
        shareLabel={t("settings.apiKeys.share")}
        doneLabel={t("settings.apiKeys.revealDone")}
      />
    );
  }

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.apiKeys.createTitle")} subtitle={t("settings.apiKeys.createDescription")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("settings.apiKeys.create")}
            loading={create.isPending}
            onPress={form.handleSubmit((values) => create.mutate(values))}
          />
        }
      >
        {create.isError ? <Callout tone="destructive" title={t("settings.apiKeys.createFailed")} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.apiKeys.nameLabel")}
              placeholder={t("settings.apiKeys.namePlaceholder")}
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
          name="allowWrite"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.apiKeys.writeLabel")}
              description={t("settings.apiKeys.writeDescription")}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
