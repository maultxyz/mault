import {
  WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION,
  type OrgOverviewCard,
  type WidgetCollectionSummary,
  type WidgetValueTrend,
} from "@magic-vault/shared";
import {
  COLLECTION_VALUE_WIDGET_URL,
  REVIEW_WIDGET_URL,
  TOTAL_CARDS_WIDGET_MIN_DIGITS,
  WIDGET_ALL_COLLECTIONS_SCOPE,
  WIDGET_ONE_DAY_MS,
  WIDGET_VALUE_CHANGE_EPSILON,
} from "@/lib/constants/widgets";
import type {
  CardReviewWidgetProps,
  CollectionValueWidgetProps,
  CollectionValueWidgetScope,
  TotalCardsWidgetProps,
  WidgetCard,
  WidgetCardListProps,
  WidgetCardListScope,
  WidgetCollectionOption,
  WidgetSummaryPropsOptions,
  WidgetValueChangeDirection,
} from "@/lib/interfaces/widgets";
import { absoluteUrl } from "@/lib/url";

function collectionUrl(collectionGuid: string): string {
  return `mault:///collection/${collectionGuid}`;
}

function cardDetailUrl(card: OrgOverviewCard, isReview: boolean): string {
  const params = new URLSearchParams({ guid: card.collectionGuid });
  if (isReview) params.set("review", "1");
  return `mault:///card/${card.scanId}?${params.toString()}`;
}

function clockTime(now: number, locale: string): string {
  return new Date(now).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function widgetCardImageUrl(card: OrgOverviewCard): string | null {
  return absoluteUrl(card.card.image?.small ?? card.card.image?.normal);
}

export function widgetSummaryImageUrls({ summary }: Pick<WidgetSummaryPropsOptions, "summary">): string[] {
  const cards = [
    ...summary.all.cardsOfTheDay,
    ...summary.review.cards,
    ...summary.collections.flatMap((collection) => [...collection.topCards, ...collection.cardsOfTheDay]),
  ];
  return cards.flatMap((card) => widgetCardImageUrl(card) ?? []);
}

function toWidgetCard(
  card: OrgOverviewCard,
  detail: string,
  { formatPrice, cardImageUris }: WidgetSummaryPropsOptions,
  isReview = false,
): WidgetCard {
  const imageUrl = widgetCardImageUrl(card);
  const price = card.price == null ? "" : formatPrice(card.price);
  return {
    scanId: card.scanId,
    collectionGuid: card.collectionGuid,
    name: card.card.name,
    detail,
    price,
    imageUri: imageUrl ? (cardImageUris.get(imageUrl) ?? "") : "",
    url: cardDetailUrl(card, isReview),
    accessibilityText: [card.card.name, detail, price].filter(Boolean).join(", "),
  };
}

function setAndCollection(card: OrgOverviewCard): string {
  return [card.card.setName, card.collectionName].filter(Boolean).join(" · ");
}

function scopeEntries<T>(
  options: WidgetSummaryPropsOptions,
  buildAll: () => T,
  buildCollection: (collection: WidgetCollectionSummary) => T,
): Record<string, T> {
  return {
    [WIDGET_ALL_COLLECTIONS_SCOPE]: buildAll(),
    ...Object.fromEntries(options.summary.collections.map((collection) => [collection.guid, buildCollection(collection)])),
  };
}

function previousLine(
  previousDay: string | null,
  formattedValue: string,
  { t, locale, now }: WidgetSummaryPropsOptions,
): string {
  if (!previousDay) return "";
  const yesterday = new Date(now - WIDGET_ONE_DAY_MS).toISOString().slice(0, 10);
  if (previousDay === yesterday) return t("widgets.value.previousYesterday", { value: formattedValue });
  const date = new Date(`${previousDay}T00:00:00Z`).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return t("widgets.value.previousOn", { value: formattedValue, date });
}

function valueScope(
  title: string,
  url: string,
  trend: WidgetValueTrend,
  options: WidgetSummaryPropsOptions,
): CollectionValueWidgetScope {
  const { t, locale, formatPrice } = options;
  const numberFormat = new Intl.NumberFormat(locale);
  const totalValue = formatPrice(trend.totalValue);
  if (trend.previousValue === null) {
    return {
      title,
      url,
      totalValue,
      previousValue: "",
      changeDirection: "none",
      change: "",
      changePercent: "",
      cardCount: numberFormat.format(trend.cardCount),
      previousCardCount: "",
      accessibilityText: [title, totalValue].join(", "),
    };
  }
  const difference = trend.totalValue - trend.previousValue;
  const changeDirection: WidgetValueChangeDirection =
    difference > WIDGET_VALUE_CHANGE_EPSILON ? "up" : difference < -WIDGET_VALUE_CHANGE_EPSILON ? "down" : "flat";
  const sign = changeDirection === "up" ? "+" : changeDirection === "down" ? "-" : "";
  const change = `${sign}${formatPrice(Math.abs(difference))}`;
  const changePercent =
    trend.previousValue > 0
      ? new Intl.NumberFormat(locale, {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "exceptZero",
        }).format(difference / trend.previousValue)
      : change;
  const previousValue = previousLine(trend.previousDay, formatPrice(trend.previousValue), options);
  return {
    title,
    url,
    totalValue,
    previousValue,
    changeDirection,
    change,
    changePercent,
    cardCount: numberFormat.format(trend.cardCount),
    previousCardCount:
      trend.previousCardCount === null
        ? ""
        : previousLine(trend.previousDay, numberFormat.format(trend.previousCardCount), options),
    accessibilityText: [
      title,
      totalValue,
      t(`widgets.value.direction.${changeDirection}`, { change, percent: changePercent }),
      previousValue,
    ].join(", "),
  };
}

export function buildCollectionValueWidgetProps(options: WidgetSummaryPropsOptions): CollectionValueWidgetProps {
  const { t, locale, now, summary } = options;
  return {
    status: "ready",
    url: COLLECTION_VALUE_WIDGET_URL,
    title: t("widgets.collectionValueTitle"),
    message: "",
    updated: t("widgets.asOf", { time: clockTime(now, locale) }),
    cardsLabel: t("widgets.value.cards"),
    changeLabel: t("widgets.value.change"),
    scopes: scopeEntries(
      options,
      () => valueScope(t("widgets.allCollections"), COLLECTION_VALUE_WIDGET_URL, summary.all, options),
      (collection) => valueScope(collection.name, collectionUrl(collection.guid), collection, options),
    ),
  };
}

export function buildTotalCardsWidgetProps(options: WidgetSummaryPropsOptions): TotalCardsWidgetProps {
  const { t, locale, now, summary } = options;
  const scope = (title: string, url: string, cardCount: number) => ({
    title,
    url,
    digits: String(cardCount).padStart(TOTAL_CARDS_WIDGET_MIN_DIGITS, "0"),
    accessibilityText: `${title}: ${t("collection.cardsCount", { count: cardCount })}`,
  });
  return {
    status: "ready",
    url: COLLECTION_VALUE_WIDGET_URL,
    title: t("widgets.totalCards.title"),
    message: "",
    updated: t("widgets.asOf", { time: clockTime(now, locale) }),
    caption: t("widgets.totalCards.caption"),
    scopes: scopeEntries(
      options,
      () => scope(t("widgets.allCollections"), COLLECTION_VALUE_WIDGET_URL, summary.all.cardCount),
      (collection) => scope(collection.name, collectionUrl(collection.guid), collection.cardCount),
    ),
  };
}

export function buildTopCardsWidgetProps(options: WidgetSummaryPropsOptions): WidgetCardListProps {
  const { t, summary } = options;
  const allScope: WidgetCardListScope = {
    title: t("widgets.topCards.onePerCollection"),
    url: COLLECTION_VALUE_WIDGET_URL,
    cards: summary.collections
      .flatMap((collection) => collection.topCards.slice(0, 1))
      .sort((first, second) => (second.price ?? 0) - (first.price ?? 0))
      .slice(0, WIDGET_SUMMARY_TOP_CARDS_PER_COLLECTION)
      .map((card) => toWidgetCard(card, card.collectionName, options)),
  };
  return {
    status: "ready",
    url: COLLECTION_VALUE_WIDGET_URL,
    symbol: "trophy.fill",
    title: t("widgets.topCards.title"),
    message: "",
    emptyMessage: t("widgets.topCards.empty"),
    scopes: scopeEntries(
      options,
      () => allScope,
      (collection) => ({
        title: collection.name,
        url: collectionUrl(collection.guid),
        cards: collection.topCards.map((card) => toWidgetCard(card, card.card.setName, options)),
      }),
    ),
  };
}

export function buildCardOfTheDayWidgetProps(options: WidgetSummaryPropsOptions): WidgetCardListProps {
  const { t, summary } = options;
  return {
    status: "ready",
    url: COLLECTION_VALUE_WIDGET_URL,
    symbol: "sparkles",
    title: t("widgets.cardOfTheDay.title"),
    message: "",
    emptyMessage: t("widgets.cardOfTheDay.empty"),
    scopes: scopeEntries(
      options,
      () => ({
        title: t("widgets.allCollections"),
        url: COLLECTION_VALUE_WIDGET_URL,
        cards: summary.all.cardsOfTheDay.map((card) => toWidgetCard(card, setAndCollection(card), options)),
      }),
      (collection) => ({
        title: collection.name,
        url: collectionUrl(collection.guid),
        cards: collection.cardsOfTheDay.map((card) => toWidgetCard(card, card.card.setName, options)),
      }),
    ),
  };
}

export function buildCardReviewWidgetProps(options: WidgetSummaryPropsOptions): CardReviewWidgetProps {
  const { t, summary, pendingAcceptedScanIds } = options;
  const cards = summary.review.cards
    .filter((card) => !pendingAcceptedScanIds.has(card.scanId))
    .map((card) => toWidgetCard(card, setAndCollection(card), options, true));
  const firstCard = cards[0];
  return {
    status: "ready",
    url: firstCard ? `mault:///review-grid?guid=${firstCard.collectionGuid}` : REVIEW_WIDGET_URL,
    title: t("widgets.review.title"),
    message: "",
    needsReviewCount: Math.max(0, summary.review.needsReviewCount - pendingAcceptedScanIds.size),
    cards,
    queue: cards.map((card) => card.scanId),
    acceptedScanIds: [],
    countCaption: t("widgets.review.countCaption"),
    acceptLabel: t("widgets.review.accept"),
    laterLabel: t("widgets.review.later"),
    doneTitle: t("widgets.review.doneTitle"),
    doneMessage: t("widgets.review.doneMessage"),
    moreInAppMessage: t("widgets.review.moreInApp"),
  };
}

export function buildWidgetCollectionOptions(options: WidgetSummaryPropsOptions): WidgetCollectionOption[] {
  return [
    { name: options.t("widgets.allCollections"), value: WIDGET_ALL_COLLECTIONS_SCOPE },
    ...options.summary.collections.map((collection) => ({ name: collection.name, value: collection.guid })),
  ];
}
