import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import { CARD_THUMB_HEIGHT, CARD_THUMB_WIDTH } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { LastScanCardProps } from "@/lib/interfaces/ui";
import { absoluteUrl } from "@/lib/url";

export function LastScanCard({ entry, priceLabel }: LastScanCardProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const imageUrl = absoluteUrl(entry.card?.image?.small) ?? entry.capturedImageUrl ?? null;
  return (
    <View
      accessible
      accessibilityLabel={[entry.card?.name ?? t("scan.unmatched"), priceLabel].filter(Boolean).join(", ")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        padding: SPACING.sm,
        borderRadius: RADIUS.lg,
        backgroundColor: colors.cameraScrim,
      }}
    >
      <View
        style={{
          width: CARD_THUMB_WIDTH,
          height: CARD_THUMB_HEIGHT,
          borderRadius: RADIUS.sm,
          overflow: "hidden",
          backgroundColor: colors.onBrandSurface,
        }}
      >
        {imageUrl ? <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="cover" /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText weight="medium" numberOfLines={1} style={{ color: colors.onCamera }}>
          {entry.card?.name ?? t("scan.unmatched")}
        </AppText>
        <AppText size="xs" numberOfLines={1} style={{ color: colors.onCamera, opacity: 0.8 }}>
          {entry.card
            ? [entry.card.setName, entry.card.collectorNumber && `#${entry.card.collectorNumber}`].filter(Boolean).join(" · ")
            : t("scan.unmatchedHint")}
        </AppText>
        <View style={{ flexDirection: "row", gap: SPACING.xs, marginTop: 2 }}>
          {entry.binNumber != null ? <Pill label={t("cards.bin", { number: entry.binNumber })} /> : null}
          {entry.lowConfidence ? <Pill tone="warning" label={t("cards.needsReview")} /> : null}
        </View>
      </View>
      {priceLabel ? (
        <AppText weight="semibold" style={{ color: colors.onCamera, fontVariant: ["tabular-nums"] }}>
          {priceLabel}
        </AppText>
      ) : null}
    </View>
  );
}
