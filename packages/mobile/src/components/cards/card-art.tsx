import { Image } from "expo-image";
import { useReducedMotion } from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ART_TRANSITION_MS } from "@/lib/constants/cards";
import type { CardArtProps } from "@/lib/interfaces/cards";

export function CardArt({ imageUrl, placeholderUrl, style, ...props }: CardArtProps) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  return (
    <Image
      {...props}
      source={imageUrl ? { uri: imageUrl } : undefined}
      placeholder={placeholderUrl ? { uri: placeholderUrl } : undefined}
      placeholderContentFit="cover"
      transition={reduceMotion ? 0 : CARD_ART_TRANSITION_MS}
      style={[{ backgroundColor: colors.muted }, style]}
    />
  );
}
