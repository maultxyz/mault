import {
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  notificationRulesQueryOptions,
  setDiscordChannel,
  updateNotificationRule,
} from "@/features/integrations/api/integrations";
import {
  changedDiscordChannels,
  toDiscordSettingsDraft,
} from "@/features/integrations/lib/discord-settings-draft";
import { toast } from "@/lib/toast";
import {
  discordSettingsDraftSchema,
  type DiscordSettingsDraftValues,
} from "@/schemas/discord-settings-draft.schema";
import type { DiscordIntegration } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useDiscordSettingsDraft(
  integration: DiscordIntegration | null | undefined,
  gameGuid: string | undefined,
) {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const settingsOpts = orgSettingsQueryOptions(activeOrg?.id);
  const rulesOpts = notificationRulesQueryOptions(activeOrg?.id, gameGuid);
  const { data: settings } = useQuery(settingsOpts);
  const { data: rules = [] } = useQuery(rulesOpts);
  const values = useMemo(
    () => toDiscordSettingsDraft(integration, rules, settings),
    [integration, rules, settings],
  );

  const form = useForm<DiscordSettingsDraftValues>({
    resolver: zodResolver(discordSettingsDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });

  const save = async (draft: DiscordSettingsDraftValues) => {
    if (!integration) return;
    const requests: Promise<{ success: boolean }>[] = [];

    const orgChannels = changedDiscordChannels(integration, draft);
    if (orgChannels) requests.push(setDiscordChannel(orgChannels));

    for (const override of integration.collections) {
      const channels = draft.overrides[override.guid];
      const changed = channels && changedDiscordChannels(override, channels);
      if (changed) {
        requests.push(
          setDiscordChannel({ collectionGuid: override.guid, ...changed }),
        );
      }
    }

    for (const rule of rules) {
      const isEnabled = draft.ruleEnabled[rule.guid];
      if (!rule.channelId || isEnabled === undefined) continue;
      if (isEnabled === rule.isEnabled) continue;
      requests.push(
        updateNotificationRule(rule.guid, {
          name: rule.name,
          rules: rule.rules,
          channelId: rule.channelId,
          roleId: rule.roleId,
          isEnabled,
        }),
      );
    }

    if (
      draft.discordNotifyOnScan !== values.discordNotifyOnScan ||
      draft.discordScanUseThreads !== values.discordScanUseThreads
    ) {
      requests.push(
        saveOrgSettings({
          discordNotifyOnScan: draft.discordNotifyOnScan,
          discordScanUseThreads: draft.discordScanUseThreads,
        }),
      );
    }

    const results = await Promise.allSettled(requests);
    const failed = results.some(
      (result) => result.status === "rejected" || !result.value.success,
    );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["discord-integration", activeOrg?.id],
      }),
      queryClient.invalidateQueries({ queryKey: rulesOpts.queryKey }),
      queryClient.invalidateQueries({ queryKey: settingsOpts.queryKey }),
    ]);

    if (failed) {
      toast.error(t("draft.saveFailed"));
      return;
    }
    form.reset(draft);
    toast.success(t("draft.saved"));
  };

  return {
    form,
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values),
  };
}
