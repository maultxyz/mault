import { RuleDialogFields } from "@/components/rule-dialog-fields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useOrg } from "@/features/companies/api/use-organization";
import {
  addNotificationRule,
  notificationRuleCountQueryOptions,
  notificationRulesQueryOptions,
  updateNotificationRule,
} from "@/features/integrations/api/integrations";
import { DiscordChannelLabel } from "@/features/integrations/components/discord-channel-label";
import { DiscordRoleSelect } from "@/features/integrations/components/discord-role-select";
import type { NotificationRuleDialogProps } from "@/lib/interfaces/integrations";
import { emptyRuleGroup } from "@/lib/rule-groups";
import { toast } from "@/lib/toast";
import {
  createNotificationRuleFormSchema,
  type NotificationRuleFormValues,
} from "@/schemas/notification-rule.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NotificationRuleInput } from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyValues(
  rule: NotificationRuleDialogProps["rule"],
): NotificationRuleFormValues {
  return {
    name: rule?.name ?? "",
    channelId: rule?.channelId ?? "",
    roleId: rule?.roleId ?? null,
    isEnabled: rule?.isEnabled ?? true,
    rules: rule?.rules ?? emptyRuleGroup(),
  };
}

export function NotificationRuleDialog({
  open,
  onOpenChange,
  rule,
  gameGuid,
  channels,
  roles,
}: NotificationRuleDialogProps) {
  const { t } = useTranslation("integrations");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const schema = useMemo(() => createNotificationRuleFormSchema(t), [t]);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotificationRuleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(rule),
  });

  useEffect(() => {
    if (open) reset(emptyValues(rule));
  }, [open, rule, reset]);

  const save = useMutation({
    mutationFn: (input: NotificationRuleInput) =>
      rule
        ? updateNotificationRule(rule.guid, input)
        : addNotificationRule(gameGuid, input),
    onSuccess: (result) => {
      if (!result.success || !result.data) {
        toast.error(result.message || t("ruleDialog.saveFailed"));
        return;
      }
      queryClient.setQueryData(
        notificationRulesQueryOptions(activeOrg?.id, gameGuid).queryKey,
        result.data,
      );
      void queryClient.invalidateQueries({
        queryKey: ["discord-integration", activeOrg?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: notificationRuleCountQueryOptions(activeOrg?.id).queryKey,
      });
      onOpenChange(false);
    },
    onError: () => toast.error(t("ruleDialog.saveFailed")),
  });

  const onSubmit = (values: NotificationRuleFormValues) =>
    save.mutate({
      name: values.name,
      channelId: values.channelId,
      roleId: values.roleId,
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
              <Label htmlFor="notification-rule-name">
                {t("ruleDialog.name")}
              </Label>
              <Input id="notification-rule-name" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.channelId}>
              <Label>{t("ruleDialog.channel")}</Label>
              <Controller
                control={control}
                name="channelId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("ruleDialog.channelPlaceholder")}
                      >
                        {field.value && (
                          <DiscordChannelLabel
                            channel={
                              channels.find((c) => c.id === field.value) ?? null
                            }
                            channelId={field.value}
                          />
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem
                          key={channel.id}
                          value={channel.id}
                          disabled={channel.missingPermissions.length > 0}
                        >
                          <DiscordChannelLabel
                            channel={channel}
                            channelId={channel.id}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.channelId]} />
            </Field>
          </div>

          <Field>
            <Label>{t("ruleDialog.role")}</Label>
            <Controller
              control={control}
              name="roleId"
              render={({ field }) => (
                <DiscordRoleSelect
                  value={field.value}
                  roles={roles}
                  onChange={field.onChange}
                />
              )}
            />
            <p className="text-sm text-foreground/70">
              {t("ruleDialog.roleHint")}
            </p>
          </Field>

          <RuleDialogFields
            control={control}
            rulesError={errors.rules}
            isPending={save.isPending}
            labels={{
              enabled: t("ruleDialog.enabled"),
              conditions: t("ruleDialog.conditions"),
              cancel: t("ruleDialog.cancel"),
              save: t("ruleDialog.save"),
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
