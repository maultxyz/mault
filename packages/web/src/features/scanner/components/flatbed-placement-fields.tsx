import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  clampFlatbedPlacementToGlass,
  roundFlatbedPlacement,
} from "@/features/scanner/lib/flatbed-placement";
import {
  FLATBED_EMPTY_PLACEMENT,
  FLATBED_PLACEMENT_FIELD_NAMES,
  FLATBED_PLACEMENT_FIELD_STEP_MM,
} from "@/lib/constants/scanner";
import type {
  FlatbedPlacement,
  FlatbedPlacementFieldsProps,
} from "@/lib/interfaces/scanner";
import { flatbedPlacementFormSchema } from "@/schemas/flatbed-placement.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function FlatbedPlacementFields({
  glassWidthMm,
  glassHeightMm,
  placement,
  onPlacementChange,
}: FlatbedPlacementFieldsProps) {
  const { t } = useTranslation("scanner");
  const idPrefix = useId();
  const hintId = `${idPrefix}-hint`;
  const maxWidthMm = Math.ceil(glassWidthMm * 10) / 10;
  const maxHeightMm = Math.ceil(glassHeightMm * 10) / 10;
  const resolver = useMemo(
    () => zodResolver(flatbedPlacementFormSchema(maxWidthMm, maxHeightMm)),
    [maxWidthMm, maxHeightMm],
  );
  const values = useMemo(
    () => (placement ? roundFlatbedPlacement(placement) : FLATBED_EMPTY_PLACEMENT),
    [placement],
  );
  const form = useForm<FlatbedPlacement>({
    resolver,
    values,
    mode: "onChange",
    shouldFocusError: false,
  });

  const applyValidPlacement = form.handleSubmit((formValues) => {
    const clampedPlacement = roundFlatbedPlacement(
      clampFlatbedPlacementToGlass(formValues, glassWidthMm, glassHeightMm),
    );
    const wasClamped = FLATBED_PLACEMENT_FIELD_NAMES.some(
      (fieldName) => clampedPlacement[fieldName] !== formValues[fieldName],
    );
    if (wasClamped) form.reset(clampedPlacement);
    onPlacementChange(clampedPlacement);
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        void applyValidPlacement();
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FLATBED_PLACEMENT_FIELD_NAMES.map((fieldName) => {
          const fieldId = `${idPrefix}-${fieldName}`;
          const isHorizontal = fieldName === "leftMm" || fieldName === "widthMm";
          return (
            <Controller
              key={fieldName}
              control={form.control}
              name={fieldName}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.error ? true : undefined}>
                  <FieldLabel htmlFor={fieldId}>
                    {t(`flatbed.calibration.fields.${fieldName}`)}
                  </FieldLabel>
                  <Input
                    id={fieldId}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={isHorizontal ? maxWidthMm : maxHeightMm}
                    step={FLATBED_PLACEMENT_FIELD_STEP_MM}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={(event) => {
                      field.onChange(event.target.valueAsNumber);
                      void applyValidPlacement();
                    }}
                    aria-invalid={!!fieldState.error}
                    aria-describedby={hintId}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          );
        })}
      </div>
      <p id={hintId} className="text-xs text-foreground/70">
        {t("flatbed.calibration.fieldsHint")}
      </p>
    </form>
  );
}
