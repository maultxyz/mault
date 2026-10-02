import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { useOrg } from "@/features/companies/api/use-organization";
import { billingQueryOptions } from "@/features/billing/api/billing";
import {
  deleteNotificationRule,
  notificationRuleCountQueryOptions,
  notificationRulesQueryOptions,
} from "@/features/integrations/api/integrations";
import { DiscordChannelLabel } from "@/features/integrations/components/discord-channel-label";
import { DiscordRoleLabel } from "@/features/integrations/components/discord-role-label";
import { NotificationRuleDialog } from "@/features/integrations/components/notification-rule-dialog";
import type { NotificationRuleListProps } from "@/lib/interfaces/integrations";
import type { DiscordSettingsDraftValues } from "@/schemas/discord-settings-draft.schema";
import { toast } from "@/lib/toast";
import type { NotificationRule, Result } from "@magic-vault/shared";
import {
  IconBell,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

export function NotificationRuleList({
  gameGuid,
  channels,
  roles,
}: NotificationRuleListProps) {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const rulesOpts = notificationRulesQueryOptions(activeOrg?.id, gameGuid);
  const { data: rules = [], isLoading } = useQuery(rulesOpts);
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const { data: totalRules = 0 } = useQuery(
    notificationRuleCountQueryOptions(activeOrg?.id),
  );
  const ruleLimit = billing?.maxNotificationRules ?? null;
  const atRuleLimit = ruleLimit !== null && totalRules >= ruleLimit;
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRule | null>(null);
  const { control, formState } = useFormContext<DiscordSettingsDraftValues>();

  const change = useMutation({
    mutationFn: (request: () => Promise<Result<NotificationRule[]>>) =>
      request(),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("rules.saveFailed"));
        return;
      }
      queryClient.setQueryData(rulesOpts.queryKey, result.data);
      void queryClient.invalidateQueries({
        queryKey: ["discord-integration", activeOrg?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: notificationRuleCountQueryOptions(activeOrg?.id).queryKey,
      });
    },
    onError: () => toast.error(t("rules.saveFailed")),
  });

  const openDialog = (rule: NotificationRule | null) => {
    setEditing(rule);
    setDialogOpen(true);
  };

  return (
    <SettingsSection
      heading={t("rules.heading")}
      description={t("rules.description")}
      action={
        <Button
          onClick={() => openDialog(null)}
          disabled={!channels.length || atRuleLimit}
        >
          <IconPlus />
          {t("rules.add")}
        </Button>
      }
    >
      {atRuleLimit && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground/70">
            {t("rules.limitReached", { count: ruleLimit })}
          </p>
          <Button variant="outline" onClick={() => navigate(SETTINGS_PATHS.billing)}>
            {t("rules.upgrade")}
          </Button>
        </div>
      )}
      {!isLoading && rules.length === 0 && (
        <EmptyState size="compact" icon={IconBell} title={t("rules.empty")} />
      )}

      {rules.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {rules.map((rule) => (
            <li key={rule.guid} className="flex items-center gap-3 px-3 py-2">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                <p className="truncate font-medium">{rule.name}</p>
                {rule.channelId ? (
                  <span className="flex items-center gap-1 text-foreground/70">
                    {t("rules.postsTo")}
                    <DiscordChannelLabel
                      channel={
                        channels.find((c) => c.id === rule.channelId) ?? null
                      }
                      channelId={rule.channelId}
                    />
                    {rule.roleId && (
                      <>
                        {t("rules.andPings")}
                        <DiscordRoleLabel
                          role={roles.find((r) => r.id === rule.roleId) ?? null}
                          roleId={rule.roleId}
                        />
                      </>
                    )}
                  </span>
                ) : (
                  <p className="text-destructive">{t("rules.noChannel")}</p>
                )}
                <RuleSummary rules={rule.rules} />
              </div>
              <Controller
                control={control}
                name={`ruleEnabled.${rule.guid}`}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? rule.isEnabled}
                    disabled={
                      !rule.channelId ||
                      change.isPending ||
                      formState.isSubmitting
                    }
                    aria-label={t("rules.enabled")}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <ButtonGroup className="shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("rules.edit", { name: rule.name })}
                  title={t("rules.edit", { name: rule.name })}
                  onClick={() => openDialog(rule)}
                >
                  <IconPencil size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="outline-destructive"
                  disabled={change.isPending}
                  aria-label={t("rules.delete", { name: rule.name })}
                  title={t("rules.delete", { name: rule.name })}
                  onClick={() =>
                    change.mutate(() => deleteNotificationRule(rule.guid))
                  }
                >
                  <IconTrash size={14} />
                </Button>
              </ButtonGroup>
            </li>
          ))}
        </ul>
      )}

      <NotificationRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editing}
        gameGuid={gameGuid}
        channels={channels}
        roles={roles}
      />
    </SettingsSection>
  );
}
