import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import {
  binConfigSchema,
  type BinConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { BinRuleGroup, DEFAULT_BIN_CAPACITY } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

export function BinConfigPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedConfig: config,
    save,
    clear,
    configs,
    apiDocsUrl,
    isPending,
    selectedSet,
    fieldDefinitions,
  } = useBinConfigs();

  const autoAssignField = selectedSet?.autoAssignField ?? null;
  const autoAssignFieldLabel =
    fieldDefinitions.find((f) => f.field === autoAssignField)?.label ??
    autoAssignField;

  const form = useForm<BinConfigFormValues>({
    resolver: zodResolver(binConfigSchema) as Resolver<BinConfigFormValues>,
    defaultValues: {
      isCatchAll: false,
      isOverride: false,
      rules: emptyRuleGroup(),
      cardLimit: DEFAULT_BIN_CAPACITY,
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      isOverride: config.isOverride ?? false,
      rules:
        config.rules.conditions.length > 0 ? config.rules : emptyRuleGroup(),
      cardLimit:
        config.cardLimit === undefined ? DEFAULT_BIN_CAPACITY : config.cardLimit,
    });
  }, [config, form]);

  const isOnlyCatchAll =
    config.isCatchAll &&
    configs.filter((c) => c.isCatchAll && c.binNumber !== config.binNumber)
      .length === 0;

  const handleSave = useCallback(
    (values: BinConfigFormValues) => {
      if (!values.isCatchAll && isOnlyCatchAll) {
        form.setError("isCatchAll", {
          message: t("binConfigPanel.needCatchAllError"),
        });
        return;
      }
      save(
        config.binNumber,
        values.rules as BinRuleGroup,
        values.isCatchAll,
        values.cardLimit,
        !values.isCatchAll && values.isOverride,
      );
    },
    [config, save, isOnlyCatchAll, form, t],
  );

  const handleClear = useCallback(() => {
    if (isOnlyCatchAll) {
      form.setError("isCatchAll", {
        message: t("binConfigPanel.needCatchAllError"),
      });
      return;
    }
    form.reset({
      isCatchAll: false,
      isOverride: false,
      rules: emptyRuleGroup(),
      cardLimit: DEFAULT_BIN_CAPACITY,
    });
    clear(config.binNumber);
  }, [config, clear, form, isOnlyCatchAll, t]);

  const isCatchAll = form.watch("isCatchAll");

  if (selectedSet?.scanOnly) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold font-heading">
            {t("binConfigPanel.binHeading", { number: config.binNumber })}
          </h2>
          {config.isCatchAll && (
            <Button type="button" variant="default" size="sm" disabled>
              {t("binConfigPanel.catchAllEnabled")}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground py-1.5 rounded-lg border px-3 text-xs bg-sidebar">
          {t("binConfigPanel.scanOnlyLocked")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSave)} className="flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-sm font-semibold font-heading">
          {t("binConfigPanel.binHeading", { number: config.binNumber })}
        </h2>
        <Controller
          name="isCatchAll"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={field.value ? "default" : "outline"}
                size="sm"
                data-tour="catch-all-toggle"
                onClick={() => field.onChange(!field.value)}
              >
                {field.value
                  ? t("binConfigPanel.catchAllEnabled")
                  : t("binConfigPanel.setCatchAll")}
              </Button>
              {field.value && (
                <p className="text-xs text-muted-foreground">
                  {t("binConfigPanel.catchAllDescription")}
                </p>
              )}
            </div>
          )}
        />
      </div>
      <Field
        className="mb-6"
        data-invalid={!!form.formState.errors.cardLimit}
      >
        <FieldLabel htmlFor="bin-card-limit">
          {t("binConfigPanel.cardLimitLabel")}
        </FieldLabel>
        <Controller
          name="cardLimit"
          control={form.control}
          render={({ field }) => (
            <Input
              id="bin-card-limit"
              type="number"
              min={1}
              placeholder={t("binConfigPanel.cardLimitPlaceholder")}
              className="max-w-32"
              value={field.value ?? ""}
              onChange={(e) => {
                const raw = e.target.value;
                field.onChange(raw === "" ? null : Number(raw));
              }}
            />
          )}
        />
        <FieldDescription>
          {t("binConfigPanel.cardLimitDescription")}
        </FieldDescription>
        <FieldError errors={[form.formState.errors.cardLimit]} />
      </Field>
      {!isCatchAll && (
        <ScrollArea>
          {!autoAssignField && (
            <Field className="mb-6">
              <div className="flex items-center gap-2">
                <Controller
                  name="isOverride"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      id="bin-override"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-describedby="bin-override-description"
                    />
                  )}
                />
                <FieldLabel htmlFor="bin-override">
                  {t("binConfigPanel.overrideLabel")}
                </FieldLabel>
              </div>
              <FieldDescription id="bin-override-description">
                {t("binConfigPanel.overrideDescription")}
              </FieldDescription>
            </Field>
          )}
          <div className="flex items-center justify-between mb-2">
            <Label>{t("binConfigPanel.rulesLabel")}</Label>
            {apiDocsUrl && (
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("binConfigPanel.apiDocsLink")}
              </a>
            )}
          </div>
          {autoAssignField ? (
            config.rules.conditions.length > 0 ? (
              <RuleSummary rules={config.rules} />
            ) : (
              <p className="text-muted-foreground py-1.5 rounded-lg border px-3 text-xs bg-sidebar">
                {t("binConfigPanel.autoAssignWaiting", {
                  field: autoAssignFieldLabel,
                })}
              </p>
            )
          ) : (
            <Controller
              name="rules"
              control={form.control}
              render={({ field }) => (
                <RuleGroupEditor
                  group={field.value as BinRuleGroup}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </ScrollArea>
      )}
      {form.formState.errors.isCatchAll && (
        <FieldError errors={[form.formState.errors.isCatchAll]} />
      )}
      {form.formState.errors.rules && (
        <FieldError errors={[form.formState.errors.rules]} />
      )}
      <div className="flex gap-2 mt-2 justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={handleClear}
          disabled={isPending}
        >
          {t("binConfigPanel.clear")}
        </Button>
        <Button type="submit" disabled={isPending} data-tour="save-bin-config">
          {isPending && <IconLoader2 className="size-4 animate-spin" />}
          {t("binConfigPanel.save")}
        </Button>
      </div>
    </form>
  );
}
