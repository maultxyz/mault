import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { sampleCardQueryOptions } from "@/features/health/api/health";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { OcrRegionTileProps } from "@/lib/interfaces/health";
import { absoluteUrl } from "@/lib/url";

function percent(value: number) {
  return Math.round(value * 1000) / 10;
}

export function OcrRegionTile({ gameKey, name, lang, regions, width }: OcrRegionTileProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [sampleIndex, setSampleIndex] = useState(0);
  const sample = useQuery(sampleCardQueryOptions(gameKey, lang, sampleIndex));
  const card = sample.data;
  const imageUrl = absoluteUrl(card?.image?.normal ?? card?.image?.small);

  return (
    <View style={{ width, gap: SPACING.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
        <AppText size="sm" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </AppText>
        {lang ? (
          <IconButton
            icon="shuffle"
            size={28}
            variant="plain"
            accessibilityLabel={t("health.ocrRegions.anotherCard")}
            disabled={sample.isFetching}
            onPress={() => setSampleIndex((i) => i + 1)}
          />
        ) : null}
      </View>
      <View
        style={{
          width: "100%",
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: RADIUS.lg,
          overflow: "hidden",
          backgroundColor: colors.muted,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        {sample.isLoading ? <Skeleton height="100%" /> : null}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} contentFit="fill" style={{ position: "absolute", inset: 0 }} />
        ) : null}
        {regions.map((region, i) => (
          <View
            key={`${region.field}-${i}`}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: `${region.x * 100}%`,
              top: `${region.y * 100}%`,
              width: `${region.width * 100}%`,
              height: `${region.height * 100}%`,
              borderWidth: 1,
              borderStyle: region.fallback ? "dashed" : "solid",
              borderColor: region.fallback ? colors.warning : colors.primary,
              backgroundColor: region.fallback ? `${colors.warning}1a` : `${colors.primary}1a`,
            }}
          />
        ))}
      </View>
      {card ? (
        <AppText size="2xs" tone="secondary" numberOfLines={1}>
          {t("health.ocrRegions.sample", { name: card.name, set: card.set.toUpperCase(), number: card.collectorNumber })}
        </AppText>
      ) : null}
      <View style={{ gap: SPACING.xs }}>
        {regions.map((region, i) => (
          <View key={`${region.field}-${i}`}>
            <AppText size="2xs" weight="medium">
              {[
                t(`health.ocrFields.${region.field}`),
                region.fallback ? t("health.ocrRegions.fallback") : null,
                region.multiline ? t("health.ocrRegions.multiline") : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
            <AppText size="2xs" tone="secondary">
              {t("health.ocrRegions.coords", {
                x: percent(region.x),
                y: percent(region.y),
                width: percent(region.width),
                height: percent(region.height),
              })}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
