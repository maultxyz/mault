import { PRICE_SOURCES, PRICE_SOURCE_STORE_NAME_KEYS } from "@magic-vault/shared";
import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import type { CardPurchaseLinksProps } from "@/lib/interfaces/cards";

export function CardPurchaseLinks({ card }: CardPurchaseLinksProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const links = PRICE_SOURCES.flatMap((source) => {
    const url = card.purchaseLinks?.[source];
    return url ? [{ source, url }] : [];
  });
  if (links.length === 0) return null;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: SPACING.lg, rowGap: SPACING.xs }}>
      {links.map(({ source, url }) => (
        <Pressable
          key={source}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(url)}
          hitSlop={SPACING.sm}
          style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs, paddingVertical: SPACING.xs }}
        >
          <AppText tone="primary">{t(PRICE_SOURCE_STORE_NAME_KEYS[source])}</AppText>
          <Icon name="external" size={14} color={colors.primaryText} />
        </Pressable>
      ))}
    </View>
  );
}
