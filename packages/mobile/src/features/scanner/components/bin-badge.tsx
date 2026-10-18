import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { BinBadgeProps } from "@/lib/interfaces/ui";

export function BinBadge({ binNumber }: BinBadgeProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const label = t("scan.handScanBin", { number: binNumber });
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${t("scan.handScanBinLabel")} ${label}`}
      style={{
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        backgroundColor: colors.primary,
      }}
    >
      <AppText size="xs" weight="medium" style={{ color: colors.primaryForeground }}>
        {t("scan.handScanBinLabel")}
      </AppText>
      <AppText size="3xl" heading weight="bold" style={{ color: colors.primaryForeground, fontVariant: ["tabular-nums"] }}>
        {label}
      </AppText>
    </View>
  );
}
