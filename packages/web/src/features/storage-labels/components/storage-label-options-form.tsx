import { LabelSheetOptionFields } from "@/components/label-sheet-option-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import type { StorageLabelOptionsFormProps } from "@/lib/interfaces/storage-labels";
import { Controller, useController } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StorageLabelOptionsForm({ form, locations }: StorageLabelOptionsFormProps) {
  const { t } = useTranslation("storage");
  const { field: templateField } = useController({ control: form.control, name: "templateId" });
  const { field: startPositionField, fieldState: startPositionState } = useController({
    control: form.control,
    name: "startPosition",
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.form.title")}</CardTitle>
        <CardDescription>{t("labels.form.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:gap-2">
        <div className="flex flex-col gap-3 md:gap-2">
          <LabelSheetOptionFields
            idPrefix="storage-label"
            templateId={templateField.value}
            onTemplateIdChange={templateField.onChange}
            startPositionField={startPositionField}
            startPositionError={startPositionState.error}
          />
        </div>
        <Controller
          name="locationGuids"
          control={form.control}
          render={({ field }) => {
            const selectedGuids = new Set(field.value);
            const allSelected = locations.length > 0 && selectedGuids.size === locations.length;
            const toggle = (locationGuid: string, checked: boolean) => {
              const next = new Set(selectedGuids);
              if (checked) next.add(locationGuid);
              else next.delete(locationGuid);
              field.onChange(locations.map((location) => location.guid).filter((guid) => next.has(guid)));
            };
            return (
              <fieldset className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1.5">
                  <legend className="text-sm font-medium">
                    {t("labels.form.locations", { count: selectedGuids.size })}
                  </legend>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => field.onChange(allSelected ? [] : locations.map((location) => location.guid))}
                  >
                    {allSelected ? t("labels.form.selectNone") : t("labels.form.selectAll")}
                  </Button>
                </div>
                <div className="grid max-h-96 gap-1 overflow-y-auto rounded-lg bg-foreground/6 p-2">
                  {locations.map((location) => {
                    const checkboxId = `storage-label-location-${location.guid}`;
                    return (
                      <Field key={location.guid} orientation="horizontal">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedGuids.has(location.guid)}
                          onCheckedChange={(checked) => toggle(location.guid, checked === true)}
                        />
                        <FieldLabel htmlFor={checkboxId} className="min-w-0 truncate font-normal">
                          {location.name}
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </div>
              </fieldset>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
