import { createWidget } from "expo-widgets";
import { CARD_OF_THE_DAY_WIDGET_NAME, EMPTY_CARD_LIST_WIDGET_PROPS } from "@/lib/constants/widgets";
import type { CollectionWidgetConfiguration, WidgetCardListProps } from "@/lib/interfaces/widgets";
import { cardListLayout } from "./card-list-widget-layout";

export const cardOfTheDayWidget = createWidget<WidgetCardListProps, CollectionWidgetConfiguration>(
  CARD_OF_THE_DAY_WIDGET_NAME,
  cardListLayout,
  EMPTY_CARD_LIST_WIDGET_PROPS,
);
