import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  deleteSoundRule,
  reorderSoundRules,
  soundClipsQueryOptions,
  soundRuleCountQueryOptions,
  soundRulesQueryOptions,
  updateSoundRule,
} from "@/features/sounds/api/sounds";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { SoundRuleDialog } from "@/features/sounds/components/sound-rule-dialog";
import type { SoundRuleListProps } from "@/lib/interfaces/sounds";
import { toast } from "@/lib/toast";
import type { Result, SoundRule } from "@magic-vault/shared";
import {
  IconArrowDown,
  IconArrowUp,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function SoundRuleList({ gameGuid }: SoundRuleListProps) {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const rulesOpts = soundRulesQueryOptions(activeOrg?.id, gameGuid);
  const { data: rules = [], isLoading } = useQuery(rulesOpts);
  const { data: clips = [] } = useQuery(soundClipsQueryOptions(activeOrg?.id));
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const { data: totalRules = 0 } = useQuery(
    soundRuleCountQueryOptions(activeOrg?.id),
  );
  const ruleLimit = billing?.maxSoundRules ?? null;
  const atRuleLimit = ruleLimit !== null && totalRules >= ruleLimit;
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SoundRule | null>(null);

  const change = useMutation({
    mutationFn: (request: () => Promise<Result<SoundRule[]>>) => request(),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("rules.saveFailed"));
        return;
      }
      queryClient.setQueryData(rulesOpts.queryKey, result.data);
      void queryClient.invalidateQueries({
        queryKey: soundRuleCountQueryOptions(activeOrg?.id).queryKey,
      });
    },
    onError: () => toast.error(t("rules.saveFailed")),
  });

  const move = (index: number, offset: number) => {
    const next = [...rules];
    const [moved] = next.splice(index, 1);
    next.splice(index + offset, 0, moved);
    change.mutate(() =>
      reorderSoundRules(
        gameGuid,
        next.map((r) => r.guid),
      ),
    );
  };

  const openDialog = (rule: SoundRule | null) => {
    setEditing(rule);
    setDialogOpen(true);
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-semibold">
            {t("rules.heading")}
          </h2>
          <p className="mt-0.5 text-sm text-foreground/70">
            {t("rules.description")}
          </p>
        </div>
        <Button
          onClick={() => openDialog(null)}
          disabled={clips.length === 0 || atRuleLimit}
        >
          <IconPlus />
          {t("rules.add")}
        </Button>
      </div>

      {atRuleLimit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3">
          <p className="text-sm text-muted-foreground">
            {t("rules.limitReached", { count: ruleLimit })}
          </p>
          <Button variant="outline" onClick={() => navigate("/app/settings")}>
            {t("rules.upgrade")}
          </Button>
        </div>
      )}
      {clips.length === 0 && (
        <p className="text-sm text-foreground/70">{t("rules.needsClip")}</p>
      )}
      {!isLoading && rules.length === 0 && clips.length > 0 && (
        <p className="text-sm text-foreground/70">{t("rules.empty")}</p>
      )}

      <ol className="flex flex-col divide-y">
        {rules.map((rule, index) => {
          const clip = clips.find((c) => c.guid === rule.clipGuid);
          return (
            <li key={rule.guid} className="flex items-center gap-3 py-2">
              <ButtonGroup orientation="vertical" className="shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={index === 0 || change.isPending}
                  aria-label={t("rules.moveUp")}
                  title={t("rules.moveUp")}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowUp size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={index === rules.length - 1 || change.isPending}
                  aria-label={t("rules.moveDown")}
                  title={t("rules.moveDown")}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowDown size={14} />
                </Button>
              </ButtonGroup>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{rule.name}</p>
                <p className="truncate text-sm text-foreground/70">
                  {clip
                    ? t("rules.plays", { clip: clip.name })
                    : t("rules.noClip")}
                </p>
                <RuleSummary rules={rule.rules} />
              </div>
              <Switch
                checked={rule.isEnabled}
                aria-label={t("rules.enabled")}
                onCheckedChange={(isEnabled) =>
                  change.mutate(() =>
                    updateSoundRule(rule.guid, {
                      name: rule.name,
                      rules: rule.rules,
                      clipGuid: rule.clipGuid,
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
                    change.mutate(() => deleteSoundRule(rule.guid))
                  }
                >
                  <IconTrash size={14} />
                </Button>
              </ButtonGroup>
            </li>
          );
        })}
      </ol>

      <SoundRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editing}
        gameGuid={gameGuid}
        clips={clips}
      />
    </section>
  );
}
