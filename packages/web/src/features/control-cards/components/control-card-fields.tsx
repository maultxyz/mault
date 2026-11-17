import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTROL_CARD_UNCHANGED } from "@/lib/constants/control-cards";
import type {
  ControlCardOption,
  ControlCardSelectFieldProps,
  ControlCardSetFieldProps,
} from "@/lib/interfaces/control-cards";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ControlCardSelectField({
  control,
  name,
  label,
  options,
  onValueChange,
}: ControlCardSelectFieldProps) {
  const fieldId = `control-card-${name}`;
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              const nextValue = value ?? CONTROL_CARD_UNCHANGED;
              field.onChange(nextValue);
              onValueChange?.(nextValue);
            }}
          >
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue>
                {options.find((option) => option.value === field.value)
                  ?.label ?? field.value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

export function ControlCardSetField({
  control,
  label,
  options,
}: ControlCardSetFieldProps) {
  const { t } = useTranslation("scanner");
  return (
    <Controller
      name="forcedSetCode"
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="control-card-forcedSetCode">{label}</FieldLabel>
          <Combobox
            items={options}
            value={options.find((option) => option.value === field.value) ?? null}
            onValueChange={(option: ControlCardOption | null) =>
              field.onChange(option?.value ?? CONTROL_CARD_UNCHANGED)
            }
            itemToStringLabel={(option: ControlCardOption) => option.label}
            isItemEqualToValue={(a: ControlCardOption, b: ControlCardOption) =>
              a?.value === b?.value
            }
          >
            <ComboboxInput
              id="control-card-forcedSetCode"
              className="w-full"
              placeholder={t("scannerControls.setSearchPlaceholder")}
            />
            <ComboboxContent>
              <ComboboxEmpty>{t("scannerControls.noSets")}</ComboboxEmpty>
              <ComboboxList>
                {(option: ControlCardOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    <span className="truncate">{option.label}</span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </Field>
      )}
    />
  );
}
