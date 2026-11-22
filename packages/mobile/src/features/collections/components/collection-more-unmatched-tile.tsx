import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, SPACING } from "@/lib/constants/theme";
import type { CollectionMoreUnmatchedTileProps } from "@/lib/interfaces/collections";

export const CollectionMoreUnmatchedTile = memo(function CollectionMoreUnmatchedTile({
  hiddenCount,
  width,
  onOpen,
}: CollectionMoreUnmatchedTileProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => ({
          width: "100%",
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: CARD_ART_RADIUS,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: colors.destructive,
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
          gap: SPACING.xs,
          padding: SPACING.sm,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <Icon name="help" size={20} color={colors.destructiveForeground} />
        <AppText size="xs" weight="medium" style={{ textAlign: "center" }}>
          {t("collection.moreUnmatched", { count: hiddenCount })}
        </AppText>
      </Pressable>
    </View>
  );
});
