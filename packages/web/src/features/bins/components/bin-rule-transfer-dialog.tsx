import { Callout } from "@/components/callout";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { binSaveInputWithRules } from "@/features/bins/lib/bin-rule-transfer";
import type { BinRuleTransferDialogProps } from "@/lib/interfaces/bins";
import { emptyRuleGroup } from "@/lib/rule-groups";
import {
  binRuleTransferSchema,
  type BinRuleTransferFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function BinRuleTransferDialog({
  source,
  open,
  onOpenChange,
}: BinRuleTransferDialogProps) {
  const { t } = useTranslation("bins");
  const { configs, save } = useBinConfigs();
  const form = useForm<BinRuleTransferFormValues>({
    resolver: zodResolver(binRuleTransferSchema),
    defaultValues: { mode: "copy", targetBinNumber: null },
    mode: "onChange",
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const targetBinNumber = useWatch({
    control: form.control,
    name: "targetBinNumber",
  });
  const targets = configs.filter((bin) => bin.binNumber !== source.binNumber);
  const target = targets.find((bin) => bin.binNumber === targetBinNumber);
  const targetHasRules =
    !!target && (target.rules.conditions.length > 0 || !!target.pickList);

  useEffect(() => {
    if (open) form.reset({ mode: "copy", targetBinNumber: null });
  }, [open, form]);

  const binName = (binNumber: number) => {
    const bin = configs.find((candidate) => candidate.binNumber === binNumber);
    return bin?.isCatchAll
      ? t("binRuleTransfer.catchAllBin", { number: binNumber })
      : t("binLabel", { number: binNumber });
  };

  const submit = (values: BinRuleTransferFormValues) => {
    const destination = targets.find(
      (bin) => bin.binNumber === values.targetBinNumber,
    );
    if (!destination) return;
    save(binSaveInputWithRules(destination, source.rules));
    if (values.mode === "move") {
      save(binSaveInputWithRules(source, emptyRuleGroup()));
    }
    onOpenChange(false);
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("binRuleTransfer.title", { bin: binName(source.binNumber) })}
      description={t("binRuleTransfer.description")}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("presetSelector.cancel")}
          </Button>
          <Button
            type="submit"
            form="bin-rule-transfer-form"
            disabled={!form.formState.isValid}
          >
            {mode === "move"
              ? t("binRuleTransfer.move")
              : t("binRuleTransfer.copy")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id="bin-rule-transfer-form"
        className="flex flex-col gap-3 md:gap-2"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          name="mode"
          control={form.control}
          render={({ field }) => (
            <ResponsiveSegmented
              label={t("binRuleTransfer.modeLabel")}
              items={[
                { key: "copy", label: t("binRuleTransfer.copy") },
                { key: "move", label: t("binRuleTransfer.move") },
              ]}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="targetBinNumber"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel>{t("binRuleTransfer.targetLabel")}</FieldLabel>
              <Select
                value={field.value == null ? null : String(field.value)}
                onValueChange={(value) =>
                  field.onChange(value == null ? null : Number(value))
                }
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={t("binRuleTransfer.targetLabel")}
                >
                  <SelectValue>
                    {field.value == null
                      ? t("binRuleTransfer.chooseBin")
                      : binName(field.value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {targets.map((bin) => (
                    <SelectItem key={bin.binNumber} value={String(bin.binNumber)}>
                      {binName(bin.binNumber)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {targetHasRules && target && (
          <Callout variant="warning">
            {t("binRuleTransfer.replaceWarning", {
              bin: binName(target.binNumber),
            })}
          </Callout>
        )}
      </form>
    </DynamicDialog>
  );
}
