import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  addSoundRule,
  soundRuleCountQueryOptions,
  soundRulesQueryOptions,
  updateSoundRule,
} from "@/features/sounds/api/sounds";
import type { SoundRuleDialogProps } from "@/lib/interfaces/sounds";
import { toast } from "@/lib/toast";
import {
  createSoundRuleFormSchema,
  type SoundRuleFormValues,
} from "@/schemas/sound-rule.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SoundRuleInput } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyValues(rule: SoundRuleDialogProps["rule"]): SoundRuleFormValues {
  return {
    name: rule?.name ?? "",
    clipGuid: rule?.clipGuid ?? "",
    isEnabled: rule?.isEnabled ?? true,
    rules: rule?.rules ?? {
      id: crypto.randomUUID(),
      combinator: "and",
      conditions: [],
    },
  };
}

export function SoundRuleDialog({
  open,
  onOpenChange,
  rule,
  gameGuid,
  clips,
}: SoundRuleDialogProps) {
  const { t } = useTranslation("sounds");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const schema = useMemo(() => createSoundRuleFormSchema(t), [t]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SoundRuleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(rule),
  });

  useEffect(() => {
    if (open) reset(emptyValues(rule));
  }, [open, rule, reset]);

  const save = useMutation({
    mutationFn: (input: SoundRuleInput) =>
      rule ? updateSoundRule(rule.guid, input) : addSoundRule(gameGuid, input),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("ruleDialog.saveFailed"));
        return;
      }
      queryClient.setQueryData(
        soundRulesQueryOptions(activeOrg?.id, gameGuid).queryKey,
        result.data,
      );
      void queryClient.invalidateQueries({
        queryKey: soundRuleCountQueryOptions(activeOrg?.id).queryKey,
      });
      onOpenChange(false);
    },
    onError: () => toast.error(t("ruleDialog.saveFailed")),
  });

  const onSubmit = (values: SoundRuleFormValues) =>
    save.mutate({
      name: values.name,
      clipGuid: values.clipGuid,
      isEnabled: values.isEnabled,
      rules: values.rules,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {rule ? t("ruleDialog.editTitle") : t("ruleDialog.addTitle")}
            </DialogTitle>
            <DialogDescription>{t("ruleDialog.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.name}>
              <Label htmlFor="sound-rule-name">{t("ruleDialog.name")}</Label>
              <Input id="sound-rule-name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.clipGuid}>
              <Label>{t("ruleDialog.clip")}</Label>
              <Controller
                control={control}
                name="clipGuid"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("ruleDialog.clipPlaceholder")}
                      >
                        {clips.find((c) => c.guid === field.value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {clips.map((clip) => (
                        <SelectItem key={clip.guid} value={clip.guid}>
                          {clip.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.clipGuid]} />
            </Field>
          </div>

          <Controller
            control={control}
            name="isEnabled"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">{t("ruleDialog.enabled")}</span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </label>
            )}
          />

          <Field data-invalid={!!errors.rules}>
            <Label>{t("ruleDialog.conditions")}</Label>
            <div className="max-h-[50vh] overflow-y-auto">
              <Controller
                control={control}
                name="rules"
                render={({ field }) => (
                  <RuleGroupEditor
                    group={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
            <FieldError errors={[errors.rules]} />
          </Field>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("ruleDialog.cancel")}
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              {t("ruleDialog.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
