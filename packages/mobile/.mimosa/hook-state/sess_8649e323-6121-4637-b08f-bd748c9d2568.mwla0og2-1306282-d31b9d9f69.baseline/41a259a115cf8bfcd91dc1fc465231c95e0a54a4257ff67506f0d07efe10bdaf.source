import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import type { OcrOverlayRegion } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { OcrRegionCropsProps } from "@/lib/interfaces/cards";

export function OcrRegionCrops({ imageUrl, regions }: OcrRegionCropsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (regions.length === 0) return null;

  const regionLabel = (region: OcrOverlayRegion) => {
    const field = t(`health.ocrFields.${region.field}`);
    if (region.fallback) return t("matchValidations.ocrFallback", { field });
    if (region.anchored === false) return t("matchValidations.ocrFixedBox", { field });
    return field;
  };

  return (
    <View style={{ gap: SPACING.sm }}>
      {regions.map((region, index) => {
        const label = regionLabel(region);
        return (
          <View key={`${region.field}-${index}`} style={{ gap: 4 }}>
            <AppText size="2xs" weight="medium">
              {label}
            </AppText>
            <View
              style={{
                width: "100%",
                aspectRatio: (region.width * CARD_ASPECT_RATIO) / region.height,
                overflow: "hidden",
                borderRadius: RADIUS.sm,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.muted,
              }}
            >
              <Image
                source={{ uri: imageUrl }}
                contentFit="fill"
                accessibilityLabel={label}
                style={{
                  position: "absolute",
                  width: `${100 / region.width}%`,
                  height: `${100 / region.height}%`,
                  left: `${(-region.x / region.width) * 100}%`,
                  top: `${(-region.y / region.height) * 100}%`,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
