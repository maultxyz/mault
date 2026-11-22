import { Image } from "expo-image";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import type { CollectionUnmatchedTileProps } from "@/lib/interfaces/collections";
import { absoluteUrl } from "@/lib/url";

export const CollectionUnmatchedTile = memo(function CollectionUnmatchedTile({
  entry,
  width,
  onOpen,
}: CollectionUnmatchedTileProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const scannedAt = formatDateTime(entry.scannedAt, i18n.language);
  const imageUrl = absoluteUrl(entry.capturedImageUrl);
  return (
    <View style={{ width }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("collection.unmatchedTileLabel", { scannedAt })}
        onPress={() => onOpen(entry.scanId)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, gap: 6, transform: [{ scale: pressed ? 0.97 : 1 }] })}
      >
        <View
          style={{
            width: "100%",
            aspectRatio: CARD_ASPECT_RATIO,
            borderRadius: CARD_ART_RADIUS,
            overflow: "hidden",
            backgroundColor: colors.muted,
            borderWidth: 2,
            borderColor: colors.destructive,
          }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="fill" accessible={false} />
          ) : null}
          <View
            style={{
              position: "absolute",
              top: SPACING.xs,
              left: SPACING.xs,
              padding: 2,
              borderRadius: RADIUS.full,
              backgroundColor: colors.destructiveStrong,
            }}
          >
            <Icon name="help" size={12} color={colors.onStatusStrong} />
          </View>
        </View>
        <View style={{ minWidth: 0, paddingHorizontal: 2 }}>
          <AppText size="xs" weight="medium" numberOfLines={1} style={{ color: colors.destructiveForeground }}>
            {t("collection.unmatchedTag")}
          </AppText>
          <AppText size="xs" tone="secondary" numberOfLines={1}>
            {scannedAt}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
});
