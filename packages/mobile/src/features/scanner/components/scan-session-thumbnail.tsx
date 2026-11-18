import { Pressable, View } from "react-native";
import { CardArt } from "@/components/cards/card-art";
import { AppText } from "@/components/ui/app-text";
import { useCompactCount } from "@/hooks/use-compact-count";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_THUMBNAIL_RADIUS } from "@/lib/constants/theme";
import { SCAN_SESSION_THUMBNAIL_WIDTH } from "@/lib/constants/ui";
import type { ScanSessionThumbnailProps } from "@/lib/interfaces/ui";

export function ScanSessionThumbnail({
  imageUrl,
  placeholderUrl,
  count,
  accessibilityLabel,
  onPress,
}: ScanSessionThumbnailProps) {
  const colors = useTheme();
  const compactCount = useCompactCount()(count);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: SCAN_SESSION_THUMBNAIL_WIDTH,
        aspectRatio: CARD_ASPECT_RATIO,
        borderRadius: CARD_THUMBNAIL_RADIUS,
        borderWidth: 2,
        borderColor: colors.onCamera,
        overflow: "hidden",
        backgroundColor: colors.cameraScrim,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      {imageUrl ? (
        <CardArt
          imageUrl={imageUrl}
          placeholderUrl={placeholderUrl}
          accessible={false}
          style={{ flex: 1 }}
          contentFit="cover"
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          backgroundColor: colors.cameraScrim,
        }}
      >
        <AppText size="2xs" weight="semibold" accessible={false} style={{ color: colors.onCamera }}>
          {compactCount.value}
        </AppText>
      </View>
    </Pressable>
  );
}
