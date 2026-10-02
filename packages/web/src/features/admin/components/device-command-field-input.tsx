import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useFirmwareFeature } from "@/features/scanner/api/use-firmware-feature";
import type {
  DeviceCommandField,
  DeviceCommandFieldInputProps,
  DeviceFirmwareNoteProps,
} from "@/lib/interfaces/device-playground";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

function FirmwareNote({ feature }: DeviceFirmwareNoteProps) {
  const { t } = useTranslation("admin");
  const { isLocked, minVersion } = useFirmwareFeature(feature);
  if (!isLocked) return null;
  return (
    <span className="text-[10px] text-amber-700 dark:text-amber-400">
      {t("devicePlayground.needsFirmware", { version: minVersion })}
    </span>
  );
}

function rangeHint(field: DeviceCommandField): string | undefined {
  if (field.min == null || field.max == null) return undefined;
  return `${field.min}-${field.max}`;
}

export function DeviceCommandFieldInput({
  commandId,
  field,
  disabled,
}: DeviceCommandFieldInputProps) {
  const { t } = useTranslation("admin");
  const { control, formState } = useFormContext();
  const id = `device-${commandId}-${field.name}`;
  const error = formState.errors[field.name]?.message;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <Label htmlFor={id} className="font-mono text-xs">
        {field.name}
      </Label>
      <Controller
        control={control}
        name={field.name}
        render={({ field: input }) => {
          if (field.type === "boolean") {
            return (
              <Switch
                id={id}
                checked={!!input.value}
                disabled={disabled}
                onCheckedChange={input.onChange}
              />
            );
          }
          if (field.type === "select") {
            return (
              <Select
                value={String(input.value)}
                disabled={disabled}
                onValueChange={(value) => value && input.onChange(value)}
              >
                <SelectTrigger id={id} className="w-full font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className="font-mono text-xs"
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          }
          const isOptional = field.type === "optionalNumber";
          return (
            <Input
              id={id}
              type="number"
              min={field.min}
              max={field.max}
              disabled={disabled}
              className="font-mono text-xs"
              placeholder={
                isOptional
                  ? t("devicePlayground.unchangedPlaceholder")
                  : rangeHint(field)
              }
              value={
                input.value == null || Number.isNaN(input.value)
                  ? ""
                  : String(input.value)
              }
              onChange={(e) =>
                input.onChange(
                  e.target.value === ""
                    ? isOptional
                      ? null
                      : Number.NaN
                    : Number(e.target.value),
                )
              }
            />
          );
        }}
      />
      {field.feature && <FirmwareNote feature={field.feature} />}
      {typeof error === "string" && (
        <span className="text-[10px] text-destructive">{error}</span>
      )}
    </div>
  );
}
