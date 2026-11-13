import { createWidget } from "expo-widgets";
import { EMPTY_CARD_LIST_WIDGET_PROPS, TOP_CARDS_WIDGET_NAME } from "@/lib/constants/widgets";
import type { CollectionWidgetConfiguration, WidgetCardListProps } from "@/lib/interfaces/widgets";
import { cardListLayout } from "./card-list-widget-layout";

export const topCardsWidget = createWidget<WidgetCardListProps, CollectionWidgetConfiguration>(
  TOP_CARDS_WIDGET_NAME,
  cardListLayout,
  EMPTY_CARD_LIST_WIDGET_PROPS,
);
