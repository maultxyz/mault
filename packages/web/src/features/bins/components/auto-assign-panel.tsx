import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AutoAssignPanel() {
  const { t } = useTranslation("bins");
  const {
    selectedSet,
    fieldDefinitions,
    isPresetMutating,
    setAutoAssignField,
    resetAutoAssign,
  } = useBinConfigs();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (!selectedSet) return null;

  const eligibleFields = fieldDefinitions.filter((f) => f.type !== "numeric");
  const isEnabled = !!selectedSet.autoAssignField;

  return (
    <Field className="rounded-lg border p-2 gap-2">
      <label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {t("autoAssignPanel.heading")}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("autoAssignPanel.description")}
          </span>
        </span>
        <Switch
          checked={isEnabled}
          disabled={isPresetMutating || eligibleFields.length === 0}
          onCheckedChange={(checked) => {
            if (checked) {
              setAutoAssignField(eligibleFields[0].field);
            } else {
              setAutoAssignField(null);
            }
          }}
        />
      </label>

      {isEnabled && (
        <div className="flex items-center gap-2">
          <FieldLabel className="sr-only">
            {t("autoAssignPanel.fieldPlaceholder")}
          </FieldLabel>
          <Select
            value={selectedSet.autoAssignField ?? ""}
            onValueChange={(value) => setAutoAssignField(value ?? null)}
          >
            <SelectTrigger
              className="flex-1 overflow-hidden"
              disabled={isPresetMutating}
            >
              <SelectValue
                placeholder={t("autoAssignPanel.fieldPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {eligibleFields.map((field) => (
                <SelectItem key={field.field} value={field.field}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            disabled={isPresetMutating}
            onClick={() => setResetDialogOpen(true)}
          >
            <IconRefresh />
          </Button>
        </div>
      )}

      <DeleteDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title={t("autoAssignPanel.resetConfirmTitle")}
        description={t("autoAssignPanel.resetConfirmDescription")}
        confirmLabel={t("autoAssignPanel.reset")}
        onConfirm={resetAutoAssign}
      />
    </Field>
  );
}
