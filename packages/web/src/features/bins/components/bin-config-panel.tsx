import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar } from "@/components/save-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import {
  DEFAULT_CATCH_ALL_MATCH_PERCENT,
  DEFAULT_MAX_COPIES,
} from "@/lib/constants/bins";
import {
  binConfigSchema,
  type BinConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BinRuleGroup,
  DEFAULT_BIN_CAPACITY,
  getCatchAllMatchThreshold,
  SCAN_RULE_MATCH_PERCENT_FIELD,
} from "@magic-vault/shared";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function lowMatchRuleGroup(percent: number | null): BinRuleGroup {
  const group = emptyRuleGroup();
  if (percent == null) return group;
  return {
    ...group,
    conditions: [
      {
        id: crypto.randomUUID(),
        field: SCAN_RULE_MATCH_PERCENT_FIELD,
        operator: "lt",
        value: percent,
      },
    ],
  };
}

export function BinConfigPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedConfig: config,
    save,
    configs,
    apiDocsUrl,
    isPending,
    fieldDefinitions,
    setBinFormDirty,
    effectiveMode,
    isModeDirty,
  } = useBinConfigs();

  const autoAssignField = effectiveMode.autoAssignField;
  const autoAssignFieldLabel =
    fieldDefinitions.find((f) => f.field === autoAssignField)?.label ??
    autoAssignField;

  const form = useForm<BinConfigFormValues>({
    resolver: zodResolver(binConfigSchema) as Resolver<BinConfigFormValues>,
    defaultValues: {
      isCatchAll: false,
      isOverride: false,
      rules: emptyRuleGroup(),
      maxCopies: null,
      lowMatchPercent: null,
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      isOverride: config.isOverride ?? false,
      rules:
        config.rules.conditions.length > 0 ? config.rules : emptyRuleGroup(),
      maxCopies: config.maxCopies ?? null,
      lowMatchPercent: config.isCatchAll
        ? getCatchAllMatchThreshold(config.rules)
        : null,
    });
  }, [config, form]);

  useEffect(() => {
    setBinFormDirty(form.formState.isDirty);
  }, [form.formState.isDirty, setBinFormDirty]);

  useEffect(() => () => setBinFormDirty(false), [setBinFormDirty]);

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
        values.isCatchAll
          ? lowMatchRuleGroup(values.lowMatchPercent)
          : (values.rules as BinRuleGroup),
        values.isCatchAll,
        config.cardLimit === undefined
          ? DEFAULT_BIN_CAPACITY
          : config.cardLimit,
        !values.isCatchAll && values.isOverride,
        values.isCatchAll || autoAssignField ? null : values.maxCopies,
      );
    },
    [config, save, isOnlyCatchAll, form, t, autoAssignField],
  );

  const handleClear = useCallback(() => {
    if (isOnlyCatchAll) {
      form.setError("isCatchAll", {
        message: t("binConfigPanel.needCatchAllError"),
      });
      return;
    }
    form.reset(
      {
        isCatchAll: false,
        isOverride: false,
        rules: emptyRuleGroup(),
        maxCopies: null,
        lowMatchPercent: null,
      },
      { keepDefaultValues: true },
    );
  }, [form, isOnlyCatchAll, t]);

  const isCatchAll = form.watch("isCatchAll");

  if (isModeDirty) {
    return (
      <p className="text-muted-foreground py-1.5 rounded-lg border px-3 text-xs bg-sidebar">
        {t("binConfigPanel.modeChangePending")}
      </p>
    );
  }

  if (effectiveMode.isRepackMode || effectiveMode.isAlphabetMode) return null;

  if (effectiveMode.scanOnly) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold font-heading">
            {t("binLabel", { number: config.binNumber })}
          </h2>
          {config.isCatchAll && (
            <Button type="button" variant="outline-selected" size="sm" disabled>
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
    <>
      <form
        id="bin-config-form"
        onSubmit={form.handleSubmit(handleSave)}
        className="flex flex-col"
      >
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-sm font-semibold font-heading">
            {t("binLabel", { number: config.binNumber })}
          </h2>
          <Controller
            name="isCatchAll"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={field.value ? "outline-selected" : "outline"}
                  size="sm"
                  data-tour="catch-all-toggle"
                  onClick={() => {
                    form.setValue("rules", emptyRuleGroup(), {
                      shouldDirty: true,
                    });
                    form.setValue("lowMatchPercent", null, {
                      shouldDirty: true,
                    });
                    field.onChange(!field.value);
                  }}
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
        <ScrollArea>
          {!autoAssignField && !isCatchAll && (
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
                    />
                  )}
                />
                <span className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="bin-override">
                    {t("binConfigPanel.overrideLabel")}
                  </FieldLabel>
                  <Tooltip>
                    <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                      <IconInfoCircle className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t("binConfigPanel.overrideDescription")}
                    </TooltipContent>
                  </Tooltip>
                </span>
              </div>
            </Field>
          )}
          {!autoAssignField && !isCatchAll && (
            <Field
              className="mb-6"
              data-invalid={!!form.formState.errors.maxCopies}
            >
              <Controller
                name="maxCopies"
                control={form.control}
                render={({ field }) => (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="bin-max-copies"
                        checked={field.value != null}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? DEFAULT_MAX_COPIES : null)
                        }
                      />
                      <span className="flex items-center gap-1.5">
                        <FieldLabel htmlFor="bin-max-copies">
                          {t("binConfigPanel.maxCopiesLabel")}
                        </FieldLabel>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                            <IconInfoCircle className="size-3.5" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            {t("binConfigPanel.maxCopiesDescription")}
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </div>
                    {field.value != null && (
                      <div className="flex items-center gap-2">
                        <Input
                          id="bin-max-copies-count"
                          type="number"
                          min={1}
                          className="max-w-24"
                          aria-label={t("binConfigPanel.maxCopiesLabel")}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? Number.NaN
                                : Number(e.target.value),
                            )
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {t("binConfigPanel.maxCopiesSuffix")}
                        </span>
                      </div>
                    )}
                  </>
                )}
              />
              <FieldError errors={[form.formState.errors.maxCopies]} />
            </Field>
          )}
          {isCatchAll ? (
            <Field
              className="mb-6"
              data-invalid={!!form.formState.errors.lowMatchPercent}
            >
              <Controller
                name="lowMatchPercent"
                control={form.control}
                render={({ field }) => (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="bin-low-match"
                        checked={field.value != null}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked ? DEFAULT_CATCH_ALL_MATCH_PERCENT : null,
                          )
                        }
                      />
                      <FieldLabel htmlFor="bin-low-match">
                        {t("binConfigPanel.lowMatchLabel")}
                      </FieldLabel>
                    </div>
                    {field.value != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("binConfigPanel.lowMatchPrefix")}
                        </span>
                        <Input
                          id="bin-low-match-percent"
                          type="number"
                          min={1}
                          max={100}
                          className="max-w-24"
                          aria-label={t("binConfigPanel.lowMatchLabel")}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === ""
                                ? Number.NaN
                                : Number(e.target.value),
                            )
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {t("binConfigPanel.lowMatchSuffix")}
                        </span>
                      </div>
                    )}
                  </>
                )}
              />
              <FieldDescription>
                {t("binConfigPanel.lowMatchDescription")}
              </FieldDescription>
              <FieldError errors={[form.formState.errors.lowMatchPercent]} />
            </Field>
          ) : (
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
          )}
          {isCatchAll ? null : autoAssignField ? (
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
        </div>
      </form>
      <SaveBar
        show={form.formState.isDirty}
        formId="bin-config-form"
        isSaving={isPending}
        onDiscard={() => form.reset()}
        saveButtonDataTour="save-bin-config"
      />
      <UnsavedChangesGuard isDirty={form.formState.isDirty} />
    </>
  );
}
