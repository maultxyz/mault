import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import type { LocationMoveFieldsProps } from "@/lib/interfaces/storage";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function LocationMoveFields({
  form,
  locations,
  idPrefix,
}: LocationMoveFieldsProps) {
  const { t } = useTranslation("storage");
  const locationGuid = form.watch("locationGuid");

  const optionLabel = (value: string) =>
    value === EMPTY_BIN_NEW_LOCATION
      ? t("emptyDialog.newLocation")
      : (locations.find((location) => location.guid === value)?.name ?? "");

  return (
    <>
      <Controller
        name="locationGuid"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel>{t("emptyDialog.locationLabel")}</FieldLabel>
            <Select
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("emptyDialog.placeholder")}>
                  {field.value ? optionLabel(field.value) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.guid} value={location.guid}>
                    {location.name}
                  </SelectItem>
                ))}
                <SelectItem value={EMPTY_BIN_NEW_LOCATION}>
                  {t("emptyDialog.newLocation")}
                </SelectItem>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {locationGuid === EMPTY_BIN_NEW_LOCATION && (
        <Controller
          name="newName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={`${idPrefix}-new-location`}>
                {t("emptyDialog.newLocationName")}
              </FieldLabel>
              <Input
                {...field}
                id={`${idPrefix}-new-location`}
                placeholder={t("emptyDialog.newLocationPlaceholder")}
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}
    </>
  );
}
