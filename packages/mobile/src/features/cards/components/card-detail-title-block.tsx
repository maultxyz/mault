import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { usePricing } from "@/hooks/use-pricing";
import { SPACING } from "@/lib/constants/theme";
import type { CardDetailTitleBlockProps } from "@/lib/interfaces/cards";

export function CardDetailTitleBlock({ name, subtitle, price }: CardDetailTitleBlockProps) {
  const pricing = usePricing();
  return (
    <View style={{ gap: SPACING.xs }}>
      <AppText size="xl" heading weight="semibold" accessibilityRole="header">
        {name}
      </AppText>
      {subtitle ? (
        <AppText size="sm" tone="secondary">
          {subtitle}
        </AppText>
      ) : null}
      {price != null ? (
        <AppText size="lg" heading weight="bold">
          {pricing.format(price)}
        </AppText>
      ) : null}
    </View>
  );
}
