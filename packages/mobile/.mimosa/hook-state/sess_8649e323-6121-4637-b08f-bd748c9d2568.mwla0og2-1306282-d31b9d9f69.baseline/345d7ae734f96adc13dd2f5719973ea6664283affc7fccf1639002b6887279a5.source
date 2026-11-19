import { View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_THUMBNAIL_RADIUS } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import type { CardThumbnailProps } from "@/lib/interfaces/cards";

export function CardThumbnail({ imageUrl, placeholderUrl, width = LIST_ROW_ICON_SIZE, accessibilityLabel }: CardThumbnailProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        width,
        aspectRatio: CARD_ASPECT_RATIO,
        borderRadius: CARD_THUMBNAIL_RADIUS,
        overflow: "hidden",
        backgroundColor: colors.muted,
      }}
    >
      {imageUrl ? (
        <CardArt
          imageUrl={imageUrl}
          placeholderUrl={placeholderUrl}
          accessible={!!accessibilityLabel}
          accessibilityLabel={accessibilityLabel}
          style={{ flex: 1 }}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}
