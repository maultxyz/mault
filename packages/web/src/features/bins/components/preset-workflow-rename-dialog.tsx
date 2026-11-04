import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { usePresetWorkflows } from "@/features/bins/api/use-preset-workflows";
import type { PresetWorkflowRenameDialogProps } from "@/lib/interfaces/bins";
import {
  presetWorkflowRenameSchema,
  type PresetWorkflowRenameFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PresetWorkflowRenameDialog({
  workflow,
  open,
  onClose,
}: PresetWorkflowRenameDialogProps) {
  const { t } = useTranslation("bins");
  const { rename, isSaving } = usePresetWorkflows();
  const form = useForm<PresetWorkflowRenameFormValues>({
    resolver: zodResolver(presetWorkflowRenameSchema),
    defaultValues: { name: workflow.name },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset({ name: workflow.name });
  }, [open, workflow.name, form]);

  const submit = async ({ name }: PresetWorkflowRenameFormValues) => {
    if (await rename(workflow, name)) onClose();
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={t("presetWorkflows.renameTitle")}
      description={t("presetWorkflows.renameDescription")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("presetSelector.cancel")}
          </Button>
          <Button
            type="submit"
            form="preset-workflow-rename-form"
            disabled={!form.formState.isValid || isSaving}
          >
            {t("presetSelector.rename")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id="preset-workflow-rename-form"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="preset-workflow-name">
                {t("presetSelector.setNameLabel")}
              </FieldLabel>
              <Input
                {...field}
                id="preset-workflow-name"
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </form>
    </DynamicDialog>
  );
}
