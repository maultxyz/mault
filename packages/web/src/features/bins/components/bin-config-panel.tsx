import { Callout } from "@/components/callout";
import { SaveBar } from "@/components/save-bar";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import {
  DEFAULT_CATCH_ALL_MATCH_PERCENT,
  DEFAULT_MAX_COPIES,
  REPACK_ALLOW_DUPLICATES_VALUE,
} from "@/lib/constants/bins";
import { emptyRuleGroup } from "@/lib/rule-groups";
import {
  binConfigSchema,
  type BinConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BinConfig,
  BinRuleGroup,
  DEFAULT_BIN_CAPACITY,
  OVERRIDE_PRIORITY_MAX,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  sortOverrideBins,
} from "@magic-vault/shared";
import { IconHelpCircle, IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";

function groupOverridesByPriority(order: BinConfig[]): BinConfig[][] {
  return order.reduce<BinConfig[][]>((groups, config) => {
    const last = groups[groups.length - 1];
    if (
      last &&
      config.overridePriority != null &&
      last[0].overridePriority === config.overridePriority
    ) {
      last.push(config);
    } else {
      groups.push([config]);
    }
    return groups;
  }, []);
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
      overridePriority: null,
      isDisabled: false,
      rules: emptyRuleGroup(),
      maxCopies: null,
      maxCopiesBy: REPACK_UNIQUE_BY_PRINTING,
      lowMatchPercent: null,
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      isOverride: config.isOverride ?? false,
      overridePriority: config.overridePriority ?? null,
      isDisabled: !config.isCatchAll && !!config.isDisabled,
      rules:
        config.rules.conditions.length > 0 ? config.rules : emptyRuleGroup(),
      maxCopies: config.maxCopies ?? null,
      maxCopiesBy: config.maxCopiesBy ?? REPACK_UNIQUE_BY_PRINTING,
      lowMatchPercent: config.isCatchAll
        ? (config.lowMatchPercent ?? null)
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

  const rulesLocked =
    effectiveMode.isRepackMode ||
    effectiveMode.isAlphabetMode ||
    effectiveMode.isChaosMode;

  const handleSave = useCallback(
    (values: BinConfigFormValues) => {
      if (!values.isCatchAll && isOnlyCatchAll) {
        form.setError("isCatchAll", {
          message: t("binConfigPanel.needCatchAllError"),
        });
        return;
      }
      const cardLimit =
        config.cardLimit === undefined
          ? DEFAULT_BIN_CAPACITY
          : config.cardLimit;
      const keepsRole = !!config.isCatchAll === values.isCatchAll;
      if (rulesLocked) {
        save({
          binNumber: config.binNumber,
          rules: keepsRole ? config.rules : emptyRuleGroup(),
          isCatchAll: values.isCatchAll,
          cardLimit,
          isOverride: !values.isCatchAll && config.isOverride,
          overridePriority: keepsRole
            ? (config.overridePriority ?? null)
            : null,
          lowMatchPercent: values.isCatchAll ? values.lowMatchPercent : null,
          maxCopies: values.isCatchAll ? null : (config.maxCopies ?? null),
          maxCopiesBy: values.isCatchAll ? null : (config.maxCopiesBy ?? null),
          isDisabled: !values.isCatchAll && values.isDisabled,
        });
        return;
      }
      const isOverride = !values.isCatchAll && values.isOverride;
      save({
        binNumber: config.binNumber,
        rules: values.rules as BinRuleGroup,
        isCatchAll: values.isCatchAll,
        cardLimit,
        isOverride,
        overridePriority:
          values.isCatchAll || isOverride ? values.overridePriority : null,
        lowMatchPercent: values.isCatchAll ? values.lowMatchPercent : null,
        maxCopies:
          values.isCatchAll || autoAssignField ? null : values.maxCopies,
        maxCopiesBy:
          values.isCatchAll || autoAssignField || values.maxCopies == null
            ? null
            : values.maxCopiesBy,
        isDisabled: !values.isCatchAll && values.isDisabled,
      });
    },
    [config, save, isOnlyCatchAll, form, t, autoAssignField, rulesLocked],
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
        overridePriority: null,
        isDisabled: form.getValues("isDisabled"),
        rules: emptyRuleGroup(),
        maxCopies: null,
        maxCopiesBy: REPACK_UNIQUE_BY_PRINTING,
        lowMatchPercent: null,
      },
      { keepDefaultValues: true },
    );
  }, [form, isOnlyCatchAll, t]);

  const isCatchAll = form.watch("isCatchAll");
  const maxCopies = form.watch("maxCopies");
  const maxCopiesBy = form.watch("maxCopiesBy");
  const copiesSelection =
    maxCopies == null ? REPACK_ALLOW_DUPLICATES_VALUE : maxCopiesBy;
  const copiesByFields = useMemo(
    () => fieldDefinitions.filter((field) => field.field !== "name"),
    [fieldDefinitions],
  );
  const copiesByLabel = (value: string) => {
    if (value === REPACK_ALLOW_DUPLICATES_VALUE)
      return t("binConfigPanel.copiesAllow");
    if (value === REPACK_UNIQUE_BY_PRINTING)
      return t("binConfigPanel.copiesByPrinting");
    if (value === REPACK_UNIQUE_BY_NAME)
      return t("binConfigPanel.copiesByName");
    const field = fieldDefinitions.find((f) => f.field === value);
    return t("binConfigPanel.copiesByField", { field: field?.label ?? value });
  };
  const isDisabled = form.watch("isDisabled");
  const isOverride = form.watch("isOverride");
  const draftRules = form.watch("rules") as BinRuleGroup;
  const draftPriority = form.watch("overridePriority");
  const hasCatchAllRules = isCatchAll && draftRules.conditions.length > 0;
  const showPriority =
    !autoAssignField && (hasCatchAllRules || (!isCatchAll && isOverride));

  const overrideOrder = useMemo(
    () =>
      sortOverrideBins(
        configs.map((c) =>
          c.binNumber === config.binNumber
            ? {
                ...c,
                rules: draftRules,
                isCatchAll,
                isOverride: !isCatchAll && isOverride,
                isDisabled: !isCatchAll && isDisabled,
                overridePriority: Number.isNaN(draftPriority)
                  ? null
                  : draftPriority,
              }
            : isCatchAll && c.isCatchAll
              ? { ...c, isCatchAll: false }
              : c,
        ),
      ).filter((c) => c.isCatchAll || !c.isDisabled),
    [
      configs,
      config.binNumber,
      draftRules,
      isCatchAll,
      isOverride,
      isDisabled,
      draftPriority,
    ],
  );

  const priorityField = showPriority && (
    <Field
      className="mb-6"
      data-invalid={!!form.formState.errors.overridePriority}
    >
      <FieldLabel htmlFor="bin-override-priority">
        {t("binConfigPanel.priorityLabel")}
      </FieldLabel>
      <Controller
        name="overridePriority"
        control={form.control}
        render={({ field }) => (
          <Input
            id="bin-override-priority"
            type="number"
            min={1}
            max={OVERRIDE_PRIORITY_MAX}
            step={1}
            className="max-w-24"
            placeholder={t("binConfigPanel.priorityPlaceholder")}
            value={
              field.value == null || Number.isNaN(field.value)
                ? ""
                : field.value
            }
            onChange={(e) =>
              field.onChange(
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
        )}
      />
      <FieldDescription>
        {t("binConfigPanel.priorityDescription")}
      </FieldDescription>
      {overrideOrder.length > 1 && (
        <p className="text-2xs text-foreground/70">
          {t("binConfigPanel.priorityOrder", {
            order: groupOverridesByPriority(overrideOrder)
              .map((group) => {
                const names = group.map((c) =>
                  c.isCatchAll
                    ? t("binConfigPanel.priorityOrderCatchAll", {
                        number: c.binNumber,
                      })
                    : t("binLabel", { number: c.binNumber }),
                );
                return names.length > 1
                  ? t("binConfigPanel.priorityOrderTie", {
                      bins: names.join(" / "),
                    })
                  : names[0];
              })
              .join(", "),
          })}
        </p>
      )}
      <FieldError errors={[form.formState.errors.overridePriority]} />
    </Field>
  );

  const disableToggle = !isCatchAll && (
    <Field className="mb-6">
      <div className="flex items-center gap-2">
        <Controller
          name="isDisabled"
          control={form.control}
          render={({ field }) => (
            <Switch
              id="bin-disabled"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FieldLabel htmlFor="bin-disabled">
          {t("binConfigPanel.disabledLabel")}
        </FieldLabel>
      </div>
      <FieldDescription>
        {t("binConfigPanel.disabledDescription")}
      </FieldDescription>
    </Field>
  );

  const lowMatchField = (
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
                <span className="text-sm text-foreground/70">
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
                <span className="text-sm text-foreground/70">
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
  );

  const catchAllToggle = (
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
              form.setValue("isOverride", false, { shouldDirty: true });
              form.setValue("overridePriority", null, { shouldDirty: true });
              form.setValue("isDisabled", false, { shouldDirty: true });
              field.onChange(!field.value);
            }}
          >
            {field.value
              ? t("binConfigPanel.catchAllEnabled")
              : t("binConfigPanel.setCatchAll")}
          </Button>
          {field.value && (
            <p className="text-xs text-foreground/70">
              {t("binConfigPanel.catchAllDescription")}
            </p>
          )}
        </div>
      )}
    />
  );

  const catchAllError = form.formState.errors.isCatchAll && (
    <FieldError errors={[form.formState.errors.isCatchAll]} />
  );

  const saveControls = (
    <>
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

  if (isModeDirty) {
    return <Callout>{t("binConfigPanel.modeChangePending")}</Callout>;
  }

  if (rulesLocked) {
    return (
      <>
        <form
          id="bin-config-form"
          onSubmit={form.handleSubmit(handleSave)}
          className="flex flex-col"
        >
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-sm font-semibold font-heading">
              {t("binLabel", { number: config.binNumber })}
            </h2>
            {catchAllToggle}
          </div>
          {isCatchAll ? lowMatchField : disableToggle}
          {catchAllError}
        </form>
        {saveControls}
      </>
    );
  }

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
        <Callout>{t("binConfigPanel.scanOnlyLocked")}</Callout>
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
          {catchAllToggle}
        </div>
        <ScrollArea>
          {disableToggle}
          {isDisabled && (
            <Callout className="mb-6">
              {t("binConfigPanel.disabledNotice")}
            </Callout>
          )}
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
                    <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
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
          {!isCatchAll && priorityField}
          {!autoAssignField && !isCatchAll && (
            <Field
              className="mb-6 gap-1.5"
              data-invalid={!!form.formState.errors.maxCopies}
            >
              <span className="flex items-center gap-1.5">
                <FieldLabel htmlFor="bin-copies-by">
                  {t("binConfigPanel.copiesLabel")}
                </FieldLabel>
                <Tooltip>
                  <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
                    <IconInfoCircle className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("binConfigPanel.maxCopiesDescription")}
                  </TooltipContent>
                </Tooltip>
              </span>
              <Select
                value={copiesSelection}
                onValueChange={(value) => {
                  if (!value || value === REPACK_ALLOW_DUPLICATES_VALUE) {
                    form.setValue("maxCopies", null, { shouldDirty: true });
                    return;
                  }
                  form.setValue("maxCopiesBy", value, { shouldDirty: true });
                  if (maxCopies == null) {
                    form.setValue("maxCopies", DEFAULT_MAX_COPIES, {
                      shouldDirty: true,
                    });
                  }
                }}
              >
                <SelectTrigger
                  id="bin-copies-by"
                  className="w-full max-w-72"
                  aria-label={t("binConfigPanel.copiesLabel")}
                >
                  <SelectValue>{copiesByLabel(copiesSelection)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={REPACK_ALLOW_DUPLICATES_VALUE}>
                      {t("binConfigPanel.copiesAllow")}
                    </SelectItem>
                    <SelectItem value={REPACK_UNIQUE_BY_PRINTING}>
                      {t("binConfigPanel.copiesByPrinting")}
                    </SelectItem>
                    <SelectItem value={REPACK_UNIQUE_BY_NAME}>
                      {t("binConfigPanel.copiesByName")}
                    </SelectItem>
                  </SelectGroup>
                  {copiesByFields.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        {copiesByFields.map((meta) => (
                          <SelectItem key={meta.field} value={meta.field}>
                            {t("binConfigPanel.copiesByField", {
                              field: meta.label,
                            })}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
              {maxCopies != null && (
                <Controller
                  name="maxCopies"
                  control={form.control}
                  render={({ field }) => (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-foreground/70">
                        {t("binConfigPanel.maxCopiesPrefix")}
                      </span>
                      <Input
                        id="bin-max-copies-count"
                        type="number"
                        min={1}
                        className="max-w-24"
                        aria-label={t("binConfigPanel.maxCopiesCountLabel")}
                        value={
                          field.value == null || Number.isNaN(field.value)
                            ? ""
                            : field.value
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ""
                              ? Number.NaN
                              : Number(e.target.value),
                          )
                        }
                      />
                      <span className="text-xs text-foreground/70">
                        {t("binConfigPanel.maxCopiesSuffix")}
                      </span>
                    </div>
                  )}
                />
              )}
              <FieldError errors={[form.formState.errors.maxCopies]} />
            </Field>
          )}
          {isCatchAll && lowMatchField}
          {isCatchAll && priorityField}
          <div className="flex items-center justify-between mb-2">
            {isCatchAll ? (
              <span className="flex items-center gap-1.5">
                <Label>{t("binConfigPanel.catchAllRulesLabel")}</Label>
                <Tooltip>
                  <TooltipTrigger
                    className="text-foreground/70 hover:text-foreground transition-colors"
                    aria-label={t("binConfigPanel.catchAllRulesDescription")}
                  >
                    <IconHelpCircle className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("binConfigPanel.catchAllRulesDescription")}
                  </TooltipContent>
                </Tooltip>
              </span>
            ) : (
              <Label>{t("binConfigPanel.rulesLabel")}</Label>
            )}
            {apiDocsUrl && (
              <a
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors"
              >
                {t("binConfigPanel.apiDocsLink")}
              </a>
            )}
          </div>
          {!isCatchAll && autoAssignField ? (
            config.rules.conditions.length > 0 ? (
              <RuleSummary rules={config.rules} />
            ) : (
              <Callout>
                {t("binConfigPanel.autoAssignWaiting", {
                  field: autoAssignFieldLabel,
                })}
              </Callout>
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
        {catchAllError}
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
      {saveControls}
    </>
  );
}
