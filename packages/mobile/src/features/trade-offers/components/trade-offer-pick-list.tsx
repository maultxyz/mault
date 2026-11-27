import { formatPrice, tradeOfferPickListSections, type TradeOfferPickListSection, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { CheckboxIndicator } from "@/components/ui/checkbox-indicator";
import { Icon } from "@/components/ui/icon";
import { ListGroup } from "@/components/ui/list-group";
import { SectionHeader } from "@/components/ui/section-header";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import type { TradeOfferPickListProps, TradeOfferPickListRowProps } from "@/lib/interfaces/trade-offers";

function TradeOfferPickListRow({ item, priceSource, isUndoable, onPicked, onUndoPick }: TradeOfferPickListRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { card } = item;
  const detailLine = [
    card.setName || card.setCode.toUpperCase(),
    card.collectorNumber ? `#${card.collectorNumber}` : null,
    t(`trade.conditions.${card.condition}`),
    card.isFoil ? t("tradeOffers.cardList.foil") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const statusLine = isUndoable
    ? t("tradeOffers.pickList.pickedUndoable")
    : item.isPicked
    ? t("tradeOffers.pickList.picked")
    : (tradeOfferPlacementLines([item.placement], t)[0] ?? null);
  const priceLabel = item.price == null ? t("tradeOffers.cardList.noPrice") : formatPrice(item.price, priceSource);
  const priceText = item.price == null ? MISSING_PRICE_TEXT : priceLabel;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={[card.name, detailLine, statusLine, priceLabel].filter(Boolean).join(", ")}
      accessibilityHint={isUndoable ? t("tradeOffers.pickList.undoHint") : undefined}
      accessibilityState={{ checked: item.isPicked, disabled: item.isPicked && !isUndoable }}
      disabled={item.isPicked && !isUndoable}
      onPress={() => (isUndoable ? onUndoPick(item.scanId) : onPicked(item.scanId))}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: SPACING.sm,
        backgroundColor: pressed ? colors.tonal : "transparent",
      })}
    >
      <CheckboxIndicator checked={item.isPicked} />
      <CardThumbnail imageUrl={card.imageUrl} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AppText
          weight="medium"
          numberOfLines={1}
          tone={item.isPicked ? "secondary" : undefined}
          style={item.isPicked ? { textDecorationLine: "line-through" } : undefined}
        >
          {card.name}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={2}>
          {detailLine}
        </AppText>
        {statusLine ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
            {item.isPicked && !isUndoable ? <Icon name="check" size={14} color={colors.successForeground} /> : null}
            <AppText
              size="xs"
              numberOfLines={2}
              weight={isUndoable ? "semibold" : undefined}
              tone={item.isPicked ? undefined : "secondary"}
              style={
                isUndoable
                  ? { color: colors.primaryText }
                  : item.isPicked
                    ? { color: colors.successForeground }
                    : undefined
              }
            >
              {statusLine}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText tone="secondary" numberOfLines={1} style={{ flexShrink: 0 }}>
        {priceText}
      </AppText>
    </Pressable>
  );
}

export function TradeOfferPickList({
  offer,
  remainingScanIds,
  placements,
  undoablePickScanIds,
  onPicked,
  onUndoPick,
}: TradeOfferPickListProps) {
  const { t } = useTranslation();
  const sections = useMemo(
    () => tradeOfferPickListSections(offer.wanted, offer.wantedPrices, placements, remainingScanIds),
    [offer.wanted, offer.wantedPrices, placements, remainingScanIds],
  );
  const sectionTitle = (section: TradeOfferPickListSection) =>
    section.kind === "storage"
      ? section.name
      : section.kind === "bin"
        ? t("tradeOffers.cardList.sectionBin", { collection: section.name, bin: section.binNumber })
        : section.kind === "collection"
          ? t("tradeOffers.cardList.sectionCollection", { collection: section.name })
          : section.kind === "missing"
            ? t("tradeOffers.cardList.sectionMissing")
            : t("tradeOffers.pickList.pickedSection");

  return (
    <View style={{ gap: SPACING.sm }}>
      <View>
        <SectionHeader title={t("tradeOffers.pickList.title")} />
        <AppText size="xs" tone="secondary">
          {t("tradeOffers.pickList.hint")}
        </AppText>
      </View>
      {sections.map((section) => (
        <View key={section.key} style={{ gap: SPACING.xs }}>
          <AppText size="sm" weight="semibold" accessibilityRole="header">
            {sectionTitle(section)}
          </AppText>
          <ListGroup>
            {section.items.map((item) => (
              <TradeOfferPickListRow
                key={item.scanId}
                item={item}
                priceSource={offer.priceSource}
                isUndoable={undoablePickScanIds.has(item.scanId)}
                onPicked={onPicked}
                onUndoPick={onUndoPick}
              />
            ))}
          </ListGroup>
        </View>
      ))}
    </View>
  );
}
