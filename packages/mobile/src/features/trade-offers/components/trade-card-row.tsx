import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { ListRow } from "@/components/ui/list-row";
import type { TradeCardRowProps } from "@/lib/interfaces/trade";

export function TradeCardRow({ name, subtitle, imageUrl, onPress, accessibilityHint, selected, value, valueAccessibilityLabel, right }: TradeCardRowProps) {
  return (
    <ListRow
      title={name}
      subtitle={subtitle}
      subtitleNumberOfLines={1}
      leading={<CardThumbnail imageUrl={imageUrl} />}
      onPress={onPress}
      accessibilityHint={accessibilityHint}
      selected={selected}
      value={value}
      valueAccessibilityLabel={valueAccessibilityLabel}
      right={right}
      rightIsInteractive={!!right && !onPress}
    />
  );
}
