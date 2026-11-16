import { PlanNotice } from "@/components/plan-notice";
import { DeleteDialog } from "@/components/delete-dialog";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { EmptyState } from "@/components/empty-state";
import { SaveBar } from "@/components/save-bar";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  deleteSoundRule,
  soundClipsQueryOptions,
  soundRuleCountQueryOptions,
  soundRulesQueryOptions,
} from "@/features/sounds/api/sounds";
import { useSoundRulesDraft } from "@/features/sounds/api/use-sound-rules-draft";
import { billingQueryOptions } from "@/features/billing/api/billing";
import { SoundRuleDialog } from "@/features/sounds/components/sound-rule-dialog";
import type { SoundRuleListProps } from "@/lib/interfaces/sounds";
import { toast } from "@/lib/toast";
import type { Result, SoundRule } from "@magic-vault/shared";
import {
  IconArrowDown,
  IconArrowUp,
  IconMusic,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function SoundRuleList({ gameGuid }: SoundRuleListProps) {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const rulesOpts = soundRulesQueryOptions(activeOrg?.id, gameGuid);
  const {
    data: rules = [],
    isLoading,
    isError,
    refetch,
  } = useQuery(rulesOpts);
  const { data: clips = [], isLoading: isClipsLoading } = useQuery(
    soundClipsQueryOptions(activeOrg?.id),
  );
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));
  const { data: totalRules = 0 } = useQuery(
    soundRuleCountQueryOptions(activeOrg?.id),
  );
  const ruleLimit = billing?.maxSoundRules ?? null;
  const atRuleLimit = ruleLimit !== null && totalRules >= ruleLimit;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SoundRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoundRule | null>(null);

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

  const draft = useSoundRulesDraft(gameGuid, rules);
  const locked = change.isPending || draft.isSaving;

  const openDialog = (rule: SoundRule | null) => {
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
          disabled={clips.length === 0 || atRuleLimit}
        >
          <IconPlus />
          {t("rules.add")}
        </Button>
      }
    >

      {atRuleLimit && (
        <PlanNotice
          message={t("rules.limitReached", { count: ruleLimit })}
          linkLabel={t("rules.upgrade")}
        />
      )}
      {isError && (
        <LoadErrorCallout
          message={t("rules.loadFailed")}
          onRetry={() => void refetch()}
        />
      )}
      {(isLoading || isClipsLoading) && <ListSkeleton rows={3} />}
      {!isClipsLoading && clips.length === 0 && (
        <EmptyState size="compact" icon={IconUpload} title={t("rules.needsClip")} />
      )}
      {!isLoading && !isError && rules.length === 0 && clips.length > 0 && (
        <EmptyState size="compact" icon={IconMusic} title={t("rules.empty")} />
      )}

      <ol className="flex flex-col divide-y divide-border empty:hidden">
        {draft.orderedRules.map((rule, index) => {
          const clip = clips.find((c) => c.guid === rule.clipGuid);
          return (
            <li key={rule.guid} className="flex items-center gap-3 px-3 py-2">
              <ButtonGroup orientation="vertical" className="shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={index === 0 || locked}
                  aria-label={t("rules.moveUp")}
                  title={t("rules.moveUp")}
                  onClick={() => draft.move(index, -1)}
                >
                  <IconArrowUp />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={index === rules.length - 1 || locked}
                  aria-label={t("rules.moveDown")}
                  title={t("rules.moveDown")}
                  onClick={() => draft.move(index, 1)}
                >
                  <IconArrowDown />
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
                checked={draft.isEnabled(rule)}
                disabled={locked}
                aria-label={t("rules.enabled")}
                onCheckedChange={(isEnabled) =>
                  draft.setEnabled(rule, isEnabled)
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
                  <IconPencil />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  disabled={locked}
                  aria-label={t("rules.delete", { name: rule.name })}
                  title={t("rules.delete", { name: rule.name })}
                  onClick={() => setDeleteTarget(rule)}
                >
                  <IconTrash />
                </Button>
              </ButtonGroup>
            </li>
          );
        })}
      </ol>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("rules.deleteConfirmTitle")}
        description={t("rules.deleteConfirmDescription", {
          name: deleteTarget?.name,
        })}
        onConfirm={() => {
          if (!deleteTarget) return;
          const ruleGuid = deleteTarget.guid;
          change.mutate(() => deleteSoundRule(ruleGuid));
        }}
      />
      <SoundRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={editing}
        gameGuid={gameGuid}
        clips={clips}
      />
      <SaveBar
        show={draft.isDirty}
        isSaving={draft.isSaving}
        onSave={draft.save}
        onDiscard={draft.discard}
      />
      <UnsavedChangesGuard isDirty={draft.isDirty} onDiscard={draft.discard} />
    </SettingsSection>
  );
}
