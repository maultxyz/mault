import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STORAGE_LABEL_TEMPLATE_IDS } from "@/lib/constants/storage-labels";
import type { StorageLabelOptionsFormProps } from "@/lib/interfaces/storage-labels";
import type { StorageLabelTemplateId } from "@/lib/interfaces/storage-labels";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StorageLabelOptionsForm({ form, locations }: StorageLabelOptionsFormProps) {
  const { t } = useTranslation("storage");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.form.title")}</CardTitle>
        <CardDescription>{t("labels.form.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:gap-2">
        <div className="grid gap-3 md:gap-2 sm:grid-cols-2">
          <Controller
            name="templateId"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="storage-label-template">{t("labels.form.template")}</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (value) field.onChange(value as StorageLabelTemplateId);
                  }}
                >
                  <SelectTrigger id="storage-label-template" className="w-full">
                    <SelectValue>{t(`labels.templates.${field.value}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STORAGE_LABEL_TEMPLATE_IDS.map((templateId) => (
                      <SelectItem key={templateId} value={templateId}>
                        {t(`labels.templates.${templateId}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            name="startPosition"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="storage-label-start-position">
                  {t("labels.form.startPosition")}
                </FieldLabel>
                <Input
                  id="storage-label-start-position"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="storage-label-start-position-hint"
                />
                <p id="storage-label-start-position-hint" className="text-xs text-foreground/70">
                  {t("labels.form.startPositionHint")}
                </p>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
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
                <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg bg-foreground/6 p-2 sm:grid-cols-2">
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
