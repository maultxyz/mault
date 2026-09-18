import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
import {
  repackConfigSchema,
  type RepackConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BinRuleGroup, RepackSlot } from "@magic-vault/shared";
import { IconInfoCircle, IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

function createSlot(): RepackSlot {
  return { id: crypto.randomUUID(), rule: emptyRuleGroup(), targetCount: 1 };
}

export function RepackPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedSet,
    isPresetMutating,
    setRepackConfig,
    effectiveMode,
    isModeDirty,
  } = useBinConfigs();

  const form = useForm({
    resolver: zodResolver(repackConfigSchema),
    defaultValues: {
      repackAllowDuplicates: false,
      repackSlots: [createSlot()],
    },
  });

  useEffect(() => {
    if (!selectedSet) return;
    form.reset({
      repackAllowDuplicates: selectedSet.repackAllowDuplicates,
      repackSlots:
        selectedSet.repackSlots.length > 0
          ? selectedSet.repackSlots
          : [createSlot()],
    });
    // Only re-sync when the active set changes - not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSet?.guid]);

  const handleSave = useCallback(
    (values: RepackConfigFormValues) => {
      setRepackConfig({
        isRepackMode: true,
        repackSlots: values.repackSlots,
        repackAllowDuplicates: values.repackAllowDuplicates,
      });
    },
    [setRepackConfig],
  );

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
        <div
          className="flex items-center gap-2"
          data-tour="repack-duplicates"
        >
          <Controller
            name="repackAllowDuplicates"
            control={form.control}
            render={({ field }) => (
              <Switch
                aria-label={t("repackPanel.allowDuplicatesLabel")}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <span className="flex items-center gap-1.5">
            <FieldLabel>{t("repackPanel.allowDuplicatesLabel")}</FieldLabel>
            <Tooltip>
              <TooltipTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                <IconInfoCircle className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t("repackPanel.allowDuplicatesDescription")}
              </TooltipContent>
            </Tooltip>
          </span>
        </div>

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
                  onClick={() =>
                    field.onChange([...field.value, createSlot()])
                  }
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
