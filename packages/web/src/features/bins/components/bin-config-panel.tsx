import { Callout } from "@/components/callout";
import { SaveBar } from "@/components/save-bar";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { BinPickListFields } from "@/features/bins/components/bin-pick-list-fields";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { BinSettingRow } from "@/features/bins/components/bin-setting-row";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BIN_SETTINGS_LIST_CLASS,
  DEFAULT_CATCH_ALL_MATCH_PERCENT,
  DEFAULT_MAX_COPIES,
  NO_OVERFLOW_VALUE,
  REPACK_ALLOW_DUPLICATES_VALUE,
  REPACK_PRIORITY_AUTO_VALUE,
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
  formatDecklist,
  getOverflowSources,
  getRepackPackBins,
  isOverflowTarget,
  OVERRIDE_PRIORITY_MAX,
  parseDecklist,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  sortOverrideBins,
  sortRepackPackBins,
} from "@magic-vault/shared";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { BinSortSource } from "@/lib/interfaces/bins";
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
    selectedSet,
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
      repackPriority: null,
      isDisabled: false,
      rules: emptyRuleGroup(),
      maxCopies: null,
      maxCopiesBy: REPACK_UNIQUE_BY_PRINTING,
      overflowBin: null,
      lowMatchPercent: null,
      pickList: null,
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      isOverride: config.isOverride ?? false,
      overridePriority: config.overridePriority ?? null,
      repackPriority: config.isCatchAll ? null : (config.repackPriority ?? null),
      isDisabled: !config.isCatchAll && !!config.isDisabled,
      rules:
        config.rules.conditions.length > 0 ? config.rules : emptyRuleGroup(),
      maxCopies: config.maxCopies ?? null,
      maxCopiesBy: config.maxCopiesBy ?? REPACK_UNIQUE_BY_PRINTING,
      overflowBin: config.overflowBin ?? null,
      lowMatchPercent: config.isCatchAll
        ? (config.lowMatchPercent ?? null)
        : null,
      pickList:
        config.pickList && !config.isCatchAll
          ? {
              mode: config.pickList.mode,
              decklist: formatDecklist(config.pickList.entries),
            }
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

  const overflowSources = useMemo(
    () => getOverflowSources(configs, config.binNumber).map((c) => c.binNumber),
    [configs, config.binNumber],
  );

  const handleSave = useCallback(
    (values: BinConfigFormValues) => {
      if (!values.isCatchAll && isOnlyCatchAll) {
        form.setError("isCatchAll", {
          message: t("binConfigPanel.needCatchAllError"),
        });
        return;
      }
      const keepsRole = !!config.isCatchAll === values.isCatchAll;
      if (rulesLocked) {
        save({
          binNumber: config.binNumber,
          rules: keepsRole ? config.rules : emptyRuleGroup(),
          isCatchAll: values.isCatchAll,
          isOverride: !values.isCatchAll && config.isOverride,
          overridePriority: keepsRole
            ? (config.overridePriority ?? null)
            : null,
          lowMatchPercent: values.isCatchAll ? values.lowMatchPercent : null,
          maxCopies: values.isCatchAll ? null : (config.maxCopies ?? null),
          maxCopiesBy: values.isCatchAll ? null : (config.maxCopiesBy ?? null),
          isDisabled: !values.isCatchAll && values.isDisabled,
          repackPriority: values.isCatchAll ? null : values.repackPriority,
        });
        return;
      }
      if (values.pickList && !values.isCatchAll) {
        save({
          binNumber: config.binNumber,
          rules: emptyRuleGroup(),
          isCatchAll: false,
          isOverride: false,
          overridePriority: null,
          lowMatchPercent: null,
          maxCopies: null,
          maxCopiesBy: null,
          overflowBin: null,
          isDisabled: values.isDisabled,
          pickList: {
            mode: values.pickList.mode,
            entries: parseDecklist(values.pickList.decklist),
          },
        });
        return;
      }
      const claimed = !values.isCatchAll && overflowSources.length > 0;
      const isOverride = !values.isCatchAll && !claimed && values.isOverride;
      save({
        binNumber: config.binNumber,
        rules: claimed ? emptyRuleGroup() : (values.rules as BinRuleGroup),
        isCatchAll: values.isCatchAll,
        isOverride,
        overridePriority:
          values.isCatchAll || isOverride ? values.overridePriority : null,
        overflowBin: values.isDisabled ? null : values.overflowBin,
        lowMatchPercent: values.isCatchAll ? values.lowMatchPercent : null,
        maxCopies:
          values.isCatchAll || autoAssignField ? null : values.maxCopies,
        maxCopiesBy:
          values.isCatchAll || autoAssignField || values.maxCopies == null
            ? null
            : values.maxCopiesBy,
        isDisabled: !values.isCatchAll && values.isDisabled,
        pickList: null,
      });
    },
    [
      config,
      save,
      isOnlyCatchAll,
      form,
      t,
      autoAssignField,
      rulesLocked,
      overflowSources,
    ],
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
        repackPriority: form.getValues("repackPriority"),
        isDisabled: form.getValues("isDisabled"),
        rules: emptyRuleGroup(),
        maxCopies: null,
        maxCopiesBy: REPACK_UNIQUE_BY_PRINTING,
        overflowBin: null,
        lowMatchPercent: null,
        pickList: null,
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
  const overflowBin = form.watch("overflowBin");
  const isClaimedOverflow = !isCatchAll && overflowSources.length > 0;
  const draftPickList = form.watch("pickList");
  const isPickList = !isCatchAll && draftPickList != null;
  const sortSourceItems: { key: BinSortSource; label: string }[] = [
    { key: "rules", label: t("binConfigPanel.sortSourceRules") },
    { key: "pickList", label: t("binConfigPanel.sortSourcePickList") },
  ];
  const sortSourceField = !isCatchAll && !isClaimedOverflow && (
    <Field className="max-w-md gap-1.5">
      <FieldLabel>{t("binConfigPanel.sortSourceLabel")}</FieldLabel>
      <ButtonGroup aria-label={t("binConfigPanel.sortSourceLabel")}>
        {sortSourceItems.map((item) => {
          const active = (isPickList ? "pickList" : "rules") === item.key;
          return (
            <Button
              key={item.key}
              type="button"
              variant={active ? "outline-selected" : "outline"}
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                form.setValue(
                  "pickList",
                  item.key === "pickList"
                    ? {
                        mode: config.pickList?.mode ?? "until_found",
                        decklist: config.pickList
                          ? formatDecklist(config.pickList.entries)
                          : "",
                      }
                    : null,
                  { shouldDirty: true },
                );
              }}
            >
              {item.label}
            </Button>
          );
        })}
      </ButtonGroup>
      <FieldDescription>
        {isPickList
          ? t("binConfigPanel.sortSourcePickListDescription")
          : t("binConfigPanel.sortSourceRulesDescription")}
      </FieldDescription>
    </Field>
  );
  const overflowOptions = useMemo(
    () =>
      configs.filter(
        (c) =>
          c.binNumber !== config.binNumber &&
          !c.isCatchAll &&
          !c.isDisabled &&
          (c.binNumber === config.overflowBin ||
            isOverflowTarget(configs, c.binNumber) ||
            (c.rules.conditions.length === 0 && !c.isOverride)),
      ),
    [configs, config.binNumber, config.overflowBin],
  );
  const draftRules = form.watch("rules") as BinRuleGroup;
  const draftPriority = form.watch("overridePriority");
  const hasCatchAllRules = isCatchAll && draftRules.conditions.length > 0;
  const showPriority =
    !autoAssignField &&
    (hasCatchAllRules || (!isCatchAll && !isClaimedOverflow && isOverride));

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

  const priorityOrderText =
    overrideOrder.length > 1 &&
    t("binConfigPanel.priorityOrder", {
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
    });

  const priorityRow = showPriority && (
    <BinSettingRow
      key="priority"
      id="bin-override-priority"
      label={t("binConfigPanel.priorityLabel")}
      description={t("binConfigPanel.priorityDescription")}
      control={
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
              className="w-20 text-right"
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
      }
    >
      {priorityOrderText && (
        <p className="text-2xs text-foreground/70">{priorityOrderText}</p>
      )}
      <FieldError errors={[form.formState.errors.overridePriority]} />
    </BinSettingRow>
  );

  const disableRow = !isCatchAll && (
    <BinSettingRow
      key="disabled"
      id="bin-disabled"
      label={t("binConfigPanel.disabledLabel")}
      description={t("binConfigPanel.disabledDescription")}
      control={
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
      }
    />
  );

  const repackPackBins = useMemo(
    () =>
      effectiveMode.isRepackMode && selectedSet
        ? getRepackPackBins(configs, selectedSet)
        : [],
    [effectiveMode.isRepackMode, selectedSet, configs],
  );
  const isRepackPackBin =
    !isCatchAll &&
    !isDisabled &&
    repackPackBins.some((c) => c.binNumber === config.binNumber);
  const draftRepackPriority = form.watch("repackPriority");
  const repackPriorityOptions = Array.from(
    {
      length: Math.max(repackPackBins.length, draftRepackPriority ?? 0),
    },
    (_, i) => i + 1,
  );
  const repackFillOrder = useMemo(
    () =>
      sortRepackPackBins(
        repackPackBins.map((c) =>
          c.binNumber === config.binNumber
            ? { ...c, repackPriority: draftRepackPriority }
            : c,
        ),
      ),
    [repackPackBins, config.binNumber, draftRepackPriority],
  );

  const repackPriorityRow = isRepackPackBin && (
    <BinSettingRow
      key="repack-priority"
      id="bin-repack-priority"
      label={t("binConfigPanel.repackPriorityLabel")}
      description={t("binConfigPanel.repackPriorityDescription")}
      control={
        <Select
          value={
            draftRepackPriority == null
              ? REPACK_PRIORITY_AUTO_VALUE
              : String(draftRepackPriority)
          }
          onValueChange={(value) =>
            form.setValue(
              "repackPriority",
              !value || value === REPACK_PRIORITY_AUTO_VALUE
                ? null
                : Number(value),
              { shouldDirty: true },
            )
          }
        >
          <SelectTrigger
            id="bin-repack-priority"
            className="w-40"
            aria-label={t("binConfigPanel.repackPriorityLabel")}
          >
            <SelectValue>
              {draftRepackPriority == null
                ? t("binConfigPanel.repackPriorityAuto")
                : t("binCard.priority", { priority: draftRepackPriority })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              <SelectItem value={REPACK_PRIORITY_AUTO_VALUE}>
                {t("binConfigPanel.repackPriorityAuto")}
              </SelectItem>
              {repackPriorityOptions.map((priority) => (
                <SelectItem key={priority} value={String(priority)}>
                  {t("binCard.priority", { priority })}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      }
    >
      {repackFillOrder.length > 1 && (
        <p className="text-2xs text-foreground/70">
          {t("binConfigPanel.repackPriorityOrder", {
            order: repackFillOrder
              .map((c) => t("binLabel", { number: c.binNumber }))
              .join(", "),
          })}
        </p>
      )}
    </BinSettingRow>
  );

  const overflowRow = !isDisabled && (
    <BinSettingRow
      key="overflow"
      id="bin-overflow"
      label={t("binConfigPanel.overflowLabel")}
      description={
        overflowOptions.length === 0
          ? t("binConfigPanel.overflowNoOptions")
          : t("binConfigPanel.overflowDescription")
      }
      control={
        <Select
          value={overflowBin == null ? NO_OVERFLOW_VALUE : String(overflowBin)}
          onValueChange={(value) =>
            form.setValue(
              "overflowBin",
              !value || value === NO_OVERFLOW_VALUE ? null : Number(value),
              { shouldDirty: true },
            )
          }
        >
          <SelectTrigger
            id="bin-overflow"
            className="w-40"
            aria-label={t("binConfigPanel.overflowLabel")}
          >
            <SelectValue>
              {overflowBin == null
                ? t("binConfigPanel.overflowNone")
                : t("binLabel", { number: overflowBin })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              <SelectItem value={NO_OVERFLOW_VALUE}>
                {t("binConfigPanel.overflowNone")}
              </SelectItem>
              {overflowOptions.map((c) => (
                <SelectItem key={c.binNumber} value={String(c.binNumber)}>
                  {t("binLabel", { number: c.binNumber })}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      }
    />
  );

  const overrideRow = !autoAssignField && !isCatchAll && !isClaimedOverflow && (
    <BinSettingRow
      key="override"
      id="bin-override"
      label={t("binConfigPanel.overrideLabel")}
      description={t("binConfigPanel.overrideDescription")}
      control={
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
      }
    />
  );

  const copiesRow = !autoAssignField && !isCatchAll && !isClaimedOverflow && (
    <BinSettingRow
      key="copies"
      id="bin-copies-by"
      label={t("binConfigPanel.copiesLabel")}
      description={t("binConfigPanel.maxCopiesDescription")}
      control={
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
            className="w-48"
            aria-label={t("binConfigPanel.copiesLabel")}
          >
            <SelectValue>{copiesByLabel(copiesSelection)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
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
                      {t("binConfigPanel.copiesByField", { field: meta.label })}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      }
    >
      {maxCopies != null && (
        <Controller
          name="maxCopies"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/70">
                {t("binConfigPanel.maxCopiesPrefix")}
              </span>
              <Input
                id="bin-max-copies-count"
                type="number"
                min={1}
                className="w-20"
                aria-label={t("binConfigPanel.maxCopiesCountLabel")}
                value={
                  field.value == null || Number.isNaN(field.value)
                    ? ""
                    : field.value
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? Number.NaN : Number(e.target.value),
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
    </BinSettingRow>
  );

  const lowMatchRow = (
    <Controller
      key="low-match"
      name="lowMatchPercent"
      control={form.control}
      render={({ field }) => (
        <BinSettingRow
          id="bin-low-match"
          label={t("binConfigPanel.lowMatchLabel")}
          description={t("binConfigPanel.lowMatchDescription")}
          control={
            <Switch
              id="bin-low-match"
              checked={field.value != null}
              onCheckedChange={(checked) =>
                field.onChange(checked ? DEFAULT_CATCH_ALL_MATCH_PERCENT : null)
              }
            />
          }
        >
          {field.value != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground/70">
                {t("binConfigPanel.lowMatchPrefix")}
              </span>
              <Input
                id="bin-low-match-percent"
                type="number"
                min={1}
                max={100}
                className="w-20"
                aria-label={t("binConfigPanel.lowMatchLabel")}
                value={Number.isNaN(field.value) ? "" : field.value}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? Number.NaN : Number(e.target.value),
                  )
                }
              />
              <span className="text-xs text-foreground/70">
                {t("binConfigPanel.lowMatchSuffix")}
              </span>
            </div>
          )}
          <FieldError errors={[form.formState.errors.lowMatchPercent]} />
        </BinSettingRow>
      )}
    />
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
              form.setValue("repackPriority", null, { shouldDirty: true });
              form.setValue("isDisabled", false, { shouldDirty: true });
              form.setValue("pickList", null, { shouldDirty: true });
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
          <div className={BIN_SETTINGS_LIST_CLASS}>
            {isCatchAll ? lowMatchRow : [disableRow, repackPriorityRow]}
          </div>
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
            <Button type="button" variant="outline-selected" disabled>
              {t("binConfigPanel.catchAllEnabled")}
            </Button>
          )}
        </div>
        <Callout>{t("binConfigPanel.scanOnlyLocked")}</Callout>
      </div>
    );
  }

  const rulesSection = !isClaimedOverflow && (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-heading text-sm font-semibold">
            {isCatchAll
              ? t("binConfigPanel.catchAllRulesLabel")
              : t("binConfigPanel.rulesLabel")}
          </h3>
          <p className="text-xs text-foreground/70">
            {isCatchAll
              ? t("binConfigPanel.catchAllRulesDescription")
              : t("binConfigPanel.rulesSectionDescription")}
          </p>
        </div>
        {apiDocsUrl && (
          <a
            href={apiDocsUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs text-foreground/70 transition-colors hover:text-foreground"
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
    </section>
  );

  const settingsRows = (
    isPickList
      ? [disableRow]
      : isCatchAll
        ? [lowMatchRow]
        : [disableRow, overflowRow, overrideRow, isOverride && priorityRow]
  ).filter(Boolean);
  const advancedRows = (
    isPickList ? [] : isCatchAll ? [priorityRow] : [copiesRow]
  ).filter(Boolean);

  return (
    <>
      <form
        id="bin-config-form"
        onSubmit={form.handleSubmit(handleSave)}
        className="flex flex-col"
      >
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-heading text-sm font-semibold">
            {t("binLabel", { number: config.binNumber })}
          </h2>
          {catchAllToggle}
        </div>
        <ScrollArea>
          <div className="flex flex-col gap-6 pb-2">
            {isDisabled && (
              <Callout>{t("binConfigPanel.disabledNotice")}</Callout>
            )}
            {sortSourceField}
            {isPickList ? (
              <BinPickListFields
                control={form.control}
                binGuid={config.pickList ? config.guid : undefined}
                savedPickList={config.pickList}
              />
            ) : (
              <>
                {isClaimedOverflow && (
                  <Callout>
                    {t("binConfigPanel.overflowTargetNotice", {
                      bins: overflowSources.join(", "),
                      count: overflowSources.length,
                    })}
                  </Callout>
                )}
                {rulesSection}
              </>
            )}
            {settingsRows.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="font-heading text-sm font-semibold">
                  {t("binConfigPanel.settingsTitle")}
                </h3>
                <div className={BIN_SETTINGS_LIST_CLASS}>{settingsRows}</div>
              </section>
            )}
            {advancedRows.length > 0 && (
              <Accordion>
                <AccordionItem value="advanced" className="border-b-0">
                  <AccordionTrigger className="py-1">
                    {t("binConfigPanel.advancedTitle")}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className={BIN_SETTINGS_LIST_CLASS}>
                      {advancedRows}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </ScrollArea>
        {catchAllError}
        {form.formState.errors.rules && (
          <FieldError errors={[form.formState.errors.rules]} />
        )}
        <div className="mt-2 flex justify-end gap-2">
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
