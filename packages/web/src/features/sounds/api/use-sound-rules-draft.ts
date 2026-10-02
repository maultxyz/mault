import { useOrg } from "@/features/companies/api/use-organization";
import {
  reorderSoundRules,
  soundRulesQueryOptions,
  updateSoundRule,
} from "@/features/sounds/api/sounds";
import {
  orderSoundRules,
  toSoundRulesDraft,
} from "@/features/sounds/lib/sound-rules-draft";
import { toast } from "@/lib/toast";
import {
  soundRulesDraftSchema,
  type SoundRulesDraftValues,
} from "@/schemas/sound-rules-draft.schema";
import type { Result, SoundRule } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function useSoundRulesDraft(gameGuid: string, rules: SoundRule[]) {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const rulesOpts = soundRulesQueryOptions(activeOrg?.id, gameGuid);
  const values = useMemo(() => toSoundRulesDraft(rules), [rules]);

  const form = useForm<SoundRulesDraftValues>({
    resolver: zodResolver(soundRulesDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const order = useWatch({ control: form.control, name: "order" });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const orderedRules = useMemo(
    () => orderSoundRules(rules, order),
    [rules, order],
  );

  const save = async (draft: SoundRulesDraftValues) => {
    const requests: (() => Promise<Result<SoundRule[]>>)[] = rules
      .filter(
        (rule) =>
          draft.enabled[rule.guid] !== undefined &&
          draft.enabled[rule.guid] !== rule.isEnabled,
      )
      .map(
        (rule) => () =>
          updateSoundRule(rule.guid, {
            name: rule.name,
            rules: rule.rules,
            clipGuid: rule.clipGuid,
            isEnabled: draft.enabled[rule.guid],
          }),
      );
    const nextOrder = orderSoundRules(rules, draft.order).map((r) => r.guid);
    if (nextOrder.some((guid, index) => guid !== rules[index]?.guid)) {
      requests.push(() => reorderSoundRules(gameGuid, nextOrder));
    }

    let latest: SoundRule[] | null = null;
    try {
      for (const request of requests) {
        const result = await request();
        if (!result.success || !result.data) {
          toast.error(result.message || t("rules.saveFailed"));
          void queryClient.invalidateQueries({ queryKey: rulesOpts.queryKey });
          return;
        }
        latest = result.data;
      }
    } catch {
      toast.error(t("rules.saveFailed"));
      void queryClient.invalidateQueries({ queryKey: rulesOpts.queryKey });
      return;
    }

    if (latest) {
      queryClient.setQueryData(rulesOpts.queryKey, latest);
      form.reset(toSoundRulesDraft(latest));
    }
    toast.success(t("rules.saved"));
  };

  return {
    orderedRules,
    isEnabled: (rule: SoundRule) => enabled[rule.guid] ?? rule.isEnabled,
    setEnabled: (rule: SoundRule, isEnabled: boolean) =>
      form.setValue(`enabled.${rule.guid}`, isEnabled, { shouldDirty: true }),
    move: (index: number, offset: number) => {
      const next = orderedRules.map((rule) => rule.guid);
      const [moved] = next.splice(index, 1);
      next.splice(index + offset, 0, moved);
      form.setValue("order", next, { shouldDirty: true });
    },
    isDirty: form.formState.isDirty,
    isSaving: form.formState.isSubmitting,
    save: () => void form.handleSubmit(save)(),
    discard: () => form.reset(values),
  };
}
