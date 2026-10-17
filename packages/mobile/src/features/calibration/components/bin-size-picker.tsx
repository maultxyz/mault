import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  BIN_HEIGHT_PRESETS,
  CUSTOM_BIN_HEIGHT_MAX_MM,
  CUSTOM_BIN_HEIGHT_MIN_MM,
  CUSTOM_BIN_SIZE_KEY,
  DEFAULT_CARD_THICKNESS_MM,
  UNLIMITED_BIN_HEIGHT,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Input } from "@/components/ui/input";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { BinSizePickerProps } from "@/lib/interfaces/calibration";

function presetKeyFor(height: number | undefined): string {
  if (height == null) return BIN_HEIGHT_PRESETS[0].key;
  return BIN_HEIGHT_PRESETS.find((p) => p.height === height)?.key ?? CUSTOM_BIN_SIZE_KEY;
}

function isValidCustom(value: number): boolean {
  return Number.isInteger(value) && value >= CUSTOM_BIN_HEIGHT_MIN_MM && value <= CUSTOM_BIN_HEIGHT_MAX_MM;
}

export function BinSizePicker({ binNumber, height, onChange }: BinSizePickerProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const [customPicked, setCustomPicked] = useState(false);
  const [text, setText] = useState(() =>
    height == null || height === UNLIMITED_BIN_HEIGHT ? "" : String(height),
  );
  const key = customPicked ? CUSTOM_BIN_SIZE_KEY : presetKeyFor(height);
  const parsed = Number(text);
  const valid = text !== "" && isValidCustom(parsed);
  const options = [...BIN_HEIGHT_PRESETS.map((p) => p.key), CUSTOM_BIN_SIZE_KEY].map((value) => ({
    value,
    label: t(`calibration.bins.presets.${value}`),
  }));

  return (
    <View style={{ gap: SPACING.xs }}>
      <SelectField value={t(`calibration.bins.presets.${key}`)} placeholder={t("calibration.bins.size")} onPress={() => setOpen(true)} />
      {key === CUSTOM_BIN_SIZE_KEY ? (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
            <Input
              accessibilityLabel={t("calibration.bins.size")}
              keyboardType="number-pad"
              value={text}
              onChangeText={(next) => {
                const digits = next.replace(/\D/g, "");
                setText(digits);
                const value = Number(digits);
                if (digits !== "" && isValidCustom(value)) onChange(binNumber, value);
              }}
            />
            <AppText size="xs" tone="secondary">
              {t("calibration.bins.customHeightUnit")}
            </AppText>
          </View>
          <AppText size="2xs" style={{ color: valid || text === "" ? colors.foregroundSecondary : colors.destructive }}>
            {valid
              ? t("calibration.bins.customHeightHint", {
                  count: Math.floor(parsed / DEFAULT_CARD_THICKNESS_MM),
                  thickness: DEFAULT_CARD_THICKNESS_MM,
                })
              : t("calibration.bins.customHeightInvalid", { min: CUSTOM_BIN_HEIGHT_MIN_MM, max: CUSTOM_BIN_HEIGHT_MAX_MM })}
          </AppText>
        </View>
      ) : null}
      <OptionSheet
        visible={open}
        title={t("calibration.bins.size")}
        options={options}
        selected={[key]}
        onSelect={(value) => {
          setOpen(false);
          if (value === CUSTOM_BIN_SIZE_KEY) {
            setCustomPicked(true);
            if (valid) onChange(binNumber, parsed);
            return;
          }
          setCustomPicked(false);
          const preset = BIN_HEIGHT_PRESETS.find((p) => p.key === value);
          if (preset) onChange(binNumber, preset.height);
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
