import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RuleGroupEditor } from "@/features/bins/components/rule-group-editor";
import type {
  RuleDialogFieldsProps,
  RuleDialogFormBase,
} from "@/lib/interfaces/rule-dialog";
import { Controller, type Control } from "react-hook-form";

export function RuleDialogFields<T extends RuleDialogFormBase>({
  control,
  rulesError,
  isPending,
  labels,
}: RuleDialogFieldsProps<T>) {
  const baseControl = control as unknown as Control<RuleDialogFormBase>;
  return (
    <>
      <Controller
        control={baseControl}
        name="isEnabled"
        render={({ field }) => (
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">{labels.enabled}</span>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />

      <Field data-invalid={!!rulesError}>
        <Label>{labels.conditions}</Label>
        <div className="max-h-[50vh] overflow-y-auto">
          <Controller
            control={baseControl}
            name="rules"
            render={({ field }) => (
              <RuleGroupEditor group={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <FieldError errors={[rulesError]} />
      </Field>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {labels.cancel}
        </DialogClose>
        <Button type="submit" disabled={isPending}>
          {labels.save}
        </Button>
      </DialogFooter>
    </>
  );
}
