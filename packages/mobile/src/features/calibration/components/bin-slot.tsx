import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { BinSizePicker } from "@/features/calibration/components/bin-size-picker";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { BinSlotProps } from "@/lib/interfaces/calibration";

export function BinSlot({ label, binNumber, binCount, height, onBinChange, onHeightChange }: BinSlotProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [open, setOpen] = useState(false);
  const options = Array.from({ length: binCount }, (_, i) => ({
    value: String(i + 1),
    label: t("calibration.binLabel", { bin: i + 1 }),
  }));
  return (
    <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs, padding: SPACING.sm, backgroundColor: colors.card }}>
      <AppText size="2xs" weight="medium" tone="secondary" style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </AppText>
      <SelectField
        value={binNumber != null ? t("calibration.binLabel", { bin: binNumber }) : null}
        placeholder={t("rules.selectPlaceholder")}
        onPress={() => setOpen(true)}
      />
      {binNumber != null ? <BinSizePicker key={binNumber} binNumber={binNumber} height={height} onChange={onHeightChange} /> : null}
      <OptionSheet
        visible={open}
        title={label}
        options={options}
        selected={binNumber != null ? [String(binNumber)] : []}
        onSelect={(value) => {
          setOpen(false);
          onBinChange(Number(value));
        }}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
