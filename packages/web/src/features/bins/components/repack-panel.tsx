import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  repackConfigSchema,
  type RepackConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { REPACK_ALLOW_DUPLICATES_VALUE } from "@/lib/constants/bins";
import {
  getRepackSiftBin,
  REPACK_UNIQUE_BY_NAME,
  REPACK_UNIQUE_BY_PRINTING,
  type RepackSlot,
} from "@magic-vault/shared";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { emptyRuleGroup } from "@/lib/rule-groups";

function createSlot(): RepackSlot {
  return { id: crypto.randomUUID(), rule: emptyRuleGroup(), targetCount: 1 };
}

export function RepackPanel() {
  const { t } = useTranslation("bins");
  const {
    configs,
    fieldDefinitions,
    selectedSet,
    isPresetMutating,
    setRepackConfig,
    effectiveMode,
    isModeDirty,
  } = useBinConfigs();

  const form = useForm({
    resolver: zodResolver(repackConfigSchema),
    defaultValues: {
      repackUniqueBy: REPACK_UNIQUE_BY_PRINTING,
      repackSiftRules: null,
      repackSlots: [createSlot()],
    },
  });

  useEffect(() => {
    if (!selectedSet) return;
    form.reset({
      repackUniqueBy:
        selectedSet.repackUniqueBy ?? REPACK_ALLOW_DUPLICATES_VALUE,
      repackSiftRules: selectedSet.repackSiftRules,
      repackSlots:
        selectedSet.repackSlots.length > 0
          ? selectedSet.repackSlots
          : [createSlot()],
    });
    // Only re-sync when the active set changes - not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSet?.guid]);

  const handleSave = useCallback(
    async (values: RepackConfigFormValues) => {
      try {
        const saved = await setRepackConfig({
          isRepackMode: true,
          repackSlots: values.repackSlots,
          repackUniqueBy:
            values.repackUniqueBy === REPACK_ALLOW_DUPLICATES_VALUE
              ? null
              : values.repackUniqueBy,
          repackSiftRules: values.repackSiftRules,
        });
        if (saved) form.reset(values);
      } catch {}
    },
    [setRepackConfig, form],
  );

  const siftBin = getRepackSiftBin(configs);

  const uniqueByFields = useMemo(
    () => fieldDefinitions.filter((field) => field.field !== "name"),
    [fieldDefinitions],
  );

  const uniqueByLabel = (value: string) => {
    if (value === REPACK_ALLOW_DUPLICATES_VALUE)
      return t("repackPanel.uniqueByAllow");
    if (value === REPACK_UNIQUE_BY_PRINTING)
      return t("repackPanel.uniqueByPrinting");
    if (value === REPACK_UNIQUE_BY_NAME) return t("repackPanel.uniqueByName");
    const field = fieldDefinitions.find((f) => f.field === value);
    return t("repackPanel.uniqueByField", { field: field?.label ?? value });
  };

  if (isModeDirty) return null;

  if (!effectiveMode.isRepackMode) return null;

  return (
    <>
      <form
        id="repack-form"
        onSubmit={form.handleSubmit(handleSave)}
        className="flex flex-col gap-3"
        data-tour="repack-panel"
      >
        <Controller
          name="repackUniqueBy"
          control={form.control}
          render={({ field }) => (
            <Field className="gap-1.5" data-tour="repack-duplicates">
              <span className="flex items-center gap-1.5">
                <FieldLabel>{t("repackPanel.uniqueByLabel")}</FieldLabel>
                <Tooltip>
                  <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
                    <IconInfoCircle className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {t("repackPanel.uniqueByDescription")}
                  </TooltipContent>
                </Tooltip>
              </span>
              <Select
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value ?? REPACK_ALLOW_DUPLICATES_VALUE)
                }
              >
                <SelectTrigger
                  className="w-full max-w-72"
                  aria-label={t("repackPanel.uniqueByLabel")}
                >
                  <SelectValue>{uniqueByLabel(field.value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={REPACK_ALLOW_DUPLICATES_VALUE}>
                      {t("repackPanel.uniqueByAllow")}
                    </SelectItem>
                    <SelectItem value={REPACK_UNIQUE_BY_PRINTING}>
                      {t("repackPanel.uniqueByPrinting")}
                    </SelectItem>
                    <SelectItem value={REPACK_UNIQUE_BY_NAME}>
                      {t("repackPanel.uniqueByName")}
                    </SelectItem>
                  </SelectGroup>
                  {uniqueByFields.length > 0 && (
                    <>
                      <SelectSeparator />
                      <SelectGroup>
                        {uniqueByFields.map((meta) => (
                          <SelectItem key={meta.field} value={meta.field}>
                            {t("repackPanel.uniqueByField", {
                              field: meta.label,
                            })}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </>
                  )}
                </SelectContent>
              </Select>
            </Field>
          )}
        />

        <Controller
          name="repackSiftRules"
          control={form.control}
          render={({ field }) => (
            <div className="flex flex-col gap-2" data-tour="repack-sift">
              <div className="flex items-center gap-2">
                <Switch
                  aria-label={t("repackPanel.siftLabel")}
                  checked={field.value != null}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? emptyRuleGroup() : null)
                  }
                />
                <span className="flex items-center gap-1.5">
                  <FieldLabel>{t("repackPanel.siftLabel")}</FieldLabel>
                  <Tooltip>
                    <TooltipTrigger className="text-foreground/70 hover:text-foreground transition-colors">
                      <IconInfoCircle className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {t("repackPanel.siftDescription")}
                    </TooltipContent>
                  </Tooltip>
                </span>
              </div>
              {field.value != null && (
                <div className="rounded-lg border p-2.5 flex flex-col gap-2">
                  <p className="text-2xs text-foreground/70">
                    {siftBin
                      ? t("repackPanel.siftHint", { bin: siftBin.binNumber })
                      : t("repackPanel.siftNoBin")}
                  </p>
                  <RuleGroupEditor
                    group={field.value}
                    onChange={field.onChange}
                  />
                </div>
              )}
            </div>
          )}
        />

        <Controller
          name="repackSlots"
          control={form.control}
          render={({ field }) => (
            <div className="flex flex-col gap-2" data-tour="repack-slots">
              <Label>{t("repackPanel.slotsLabel")}</Label>
              <ScrollArea>
                <div className="flex flex-col gap-3 pr-2">
                  {field.value.map((slot, index) => (
                    <div
                      key={slot.id}
                      className="rounded-lg border p-2.5 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Field className="flex-1 gap-1">
                          <FieldLabel htmlFor={`repack-slot-count-${slot.id}`}>
                            {t("repackPanel.slotCountLabel")}
                          </FieldLabel>
                          <Input
                            id={`repack-slot-count-${slot.id}`}
                            type="number"
                            min={1}
                            className="max-w-24"
                            value={slot.targetCount}
                            onChange={(e) => {
                              const next = [...field.value];
                              next[index] = {
                                ...slot,
                                targetCount: Math.max(
                                  1,
                                  Number(e.target.value) || 1,
                                ),
                              };
                              field.onChange(next);
                            }}
                          />
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            field.onChange(
                              field.value.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <IconTrash />
                        </Button>
                      </div>
                      <RuleGroupEditor
                        group={slot.rule}
                        onChange={(updated) => {
                          const next = [...field.value];
                          next[index] = { ...slot, rule: updated };
                          field.onChange(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-tour="repack-add-slot"
                  onClick={() => field.onChange([...field.value, createSlot()])}
                >
                  <IconPlus /> {t("repackPanel.addSlot")}
                </Button>
              </div>
            </div>
          )}
        />
      </form>
      <SaveBar
        show={form.formState.isDirty}
        formId="repack-form"
        isSaving={isPresetMutating}
        onDiscard={() => form.reset()}
        saveButtonDataTour="repack-save"
      />
      <UnsavedChangesGuard isDirty={form.formState.isDirty} />
    </>
  );
}
