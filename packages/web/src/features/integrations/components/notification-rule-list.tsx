import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  deleteNotificationRule,
  notificationRulesQueryOptions,
  updateNotificationRule,
} from "@/features/integrations/api/integrations";
import { DiscordChannelLabel } from "@/features/integrations/components/discord-channel-label";
import { NotificationRuleDialog } from "@/features/integrations/components/notification-rule-dialog";
import type { NotificationRuleListProps } from "@/lib/interfaces/integrations";
import { toast } from "@/lib/toast";
import type { NotificationRule, Result } from "@magic-vault/shared";
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function NotificationRuleList({
  gameGuid,
  channels,
}: NotificationRuleListProps) {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const rulesOpts = notificationRulesQueryOptions(activeOrg?.id, gameGuid);
  const { data: rules = [], isLoading } = useQuery(rulesOpts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NotificationRule | null>(null);

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
    },
    onError: () => toast.error(t("rules.saveFailed")),
  });

  const openDialog = (rule: NotificationRule | null) => {
    setEditing(rule);
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("rules.heading")}</h3>
          <p className="text-sm text-foreground/70">
            {t("rules.description")}
          </p>
        </div>
        <Button onClick={() => openDialog(null)} disabled={!channels.length}>
          <IconPlus />
          {t("rules.add")}
        </Button>
      </div>

      {!isLoading && rules.length === 0 && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {t("rules.empty")}
        </p>
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
                  </span>
                ) : (
                  <p className="text-destructive">{t("rules.noChannel")}</p>
                )}
                <RuleSummary rules={rule.rules} />
              </div>
              <Switch
                checked={rule.isEnabled}
                disabled={!rule.channelId || change.isPending}
                aria-label={t("rules.enabled")}
                onCheckedChange={(isEnabled) =>
                  rule.channelId &&
                  change.mutate(() =>
                    updateNotificationRule(rule.guid, {
                      name: rule.name,
                      rules: rule.rules,
                      channelId: rule.channelId!,
                      isEnabled,
                    }),
                  )
                }
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
      />
    </div>
  );
}
