import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { binSizeOptionFor } from "@/features/calibration/lib/bin-size";
import type {
  BinSizeSelectProps,
  CustomBinHeightInputProps,
} from "@/lib/interfaces/calibration";
import { cn } from "@/lib/utils";
import {
  BIN_HEIGHT_PRESETS,
  computeBinCapacity,
  CUSTOM_BIN_HEIGHT_MAX_MM,
  CUSTOM_BIN_HEIGHT_MIN_MM,
  CUSTOM_BIN_SIZE_KEY,
  DEFAULT_BIN_HEIGHT,
  DEFAULT_CARD_THICKNESS_MM,
  isValidBinHeight,
  UNLIMITED_BIN_HEIGHT,
} from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function parseCustomHeight(text: string): number | null {
  if (text.trim() === "") return null;
  const value = Number(text);
  return value !== UNLIMITED_BIN_HEIGHT && isValidBinHeight(value)
    ? value
    : null;
}

function initialCustomText(height: number | undefined): string {
  return String(
    height == null || height === UNLIMITED_BIN_HEIGHT
      ? DEFAULT_BIN_HEIGHT
      : height,
  );
}

function CustomBinHeightInput({
  binNumber,
  height,
  onChange,
}: CustomBinHeightInputProps) {
  const { t } = useTranslation("calibration");
  const [text, setText] = useState(() => initialCustomText(height));
  const [syncedHeight, setSyncedHeight] = useState(height);
  if (height !== syncedHeight) {
    setSyncedHeight(height);
    if (parseCustomHeight(text) !== height) setText(initialCustomText(height));
  }

  const value = parseCustomHeight(text);
  const capacity = value == null ? null : computeBinCapacity(value, null);

  return (
    <div className="flex flex-col gap-1">
      <InputGroup className="h-8">
        <InputGroupInput
          type="number"
          inputMode="decimal"
          min={CUSTOM_BIN_HEIGHT_MIN_MM}
          max={CUSTOM_BIN_HEIGHT_MAX_MM}
          step="any"
          value={text}
          aria-label={t("binConfigurations.customHeightLabel", {
            bin: binNumber,
          })}
          aria-invalid={value == null}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            const parsed = parseCustomHeight(next);
            if (parsed != null) onChange(binNumber, parsed);
          }}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>
            {t("binConfigurations.customHeightUnit")}
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <span
        className={cn(
          "text-2xs",
          value == null ? "text-destructive" : "text-foreground/70",
        )}
      >
        {capacity == null
          ? t("binConfigurations.customHeightInvalid", {
              min: CUSTOM_BIN_HEIGHT_MIN_MM,
              max: CUSTOM_BIN_HEIGHT_MAX_MM,
            })
          : t("binConfigurations.customHeightHint", {
              count: capacity,
              thickness: DEFAULT_CARD_THICKNESS_MM,
            })}
      </span>
    </div>
  );
}

export function BinSizeSelect({
  binNumber,
  height,
  onChange,
  className,
}: BinSizeSelectProps) {
  const { t } = useTranslation("calibration");
  const [customPicked, setCustomPicked] = useState(false);
  const option = customPicked ? CUSTOM_BIN_SIZE_KEY : binSizeOptionFor(height);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Select
        value={option}
        onValueChange={(key) => {
          if (key === CUSTOM_BIN_SIZE_KEY) {
            setCustomPicked(true);
            const customHeight = Number(initialCustomText(height));
            if (customHeight !== height) onChange(binNumber, customHeight);
            return;
          }
          const preset = BIN_HEIGHT_PRESETS.find((p) => p.key === key);
          if (!preset) return;
          setCustomPicked(false);
          onChange(binNumber, preset.height);
        }}
      >
        <SelectTrigger className="h-8 w-full text-xs">
          <SelectValue>{t(`binConfigurations.presets.${option}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {BIN_HEIGHT_PRESETS.map((preset) => (
            <SelectItem key={preset.key} value={preset.key}>
              {t(`binConfigurations.presets.${preset.key}`)}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_BIN_SIZE_KEY}>
            {t(`binConfigurations.presets.${CUSTOM_BIN_SIZE_KEY}`)}
          </SelectItem>
        </SelectContent>
      </Select>
      {option === CUSTOM_BIN_SIZE_KEY && (
        <CustomBinHeightInput
          binNumber={binNumber}
          height={height}
          onChange={onChange}
        />
      )}
    </div>
  );
}
