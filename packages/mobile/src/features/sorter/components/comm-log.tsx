import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { COMM_LOG_VISIBLE_ENTRIES } from "@/lib/constants/sorter";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { CommLogProps } from "@/lib/interfaces/ui";

export function CommLog({ entries }: CommLogProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const visible = entries.slice(-COMM_LOG_VISIBLE_ENTRIES).reverse();
  if (visible.length === 0) {
    return <AppText tone="secondary">{t("sorter.commLogEmpty")}</AppText>;
  }
  return (
    <View style={{ gap: 2, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
      {visible.map((entry, index) => (
        <AppText
          key={`${entry.timestamp}-${index}`}
          size="2xs"
          mono
          tone={entry.direction === "sent" ? "primary" : "default"}
          numberOfLines={3}
        >
          {`${entry.direction === "sent" ? "→" : "←"} ${entry.text}`}
        </AppText>
      ))}
    </View>
  );
}
