import { CARD_PRICE_HISTORY_DAY_MS } from "./constants/card-price-history.constant";
import { PRICE_SOURCE_FIELDS } from "./constants/price-source.constant";
import type {
  CardPriceHistoryDay,
  CardPriceHistoryPoint,
  CardPriceHistoryPriceKey,
  CardPriceHistorySeries,
  CardPriceHistorySeriesOptions,
} from "./interfaces/card-price-history.interface";

export function utcDayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToUtcDay(day: string, days: number): string {
  return utcDayOf(new Date(Date.parse(`${day}T00:00:00Z`) + days * CARD_PRICE_HISTORY_DAY_MS));
}

function currentPriceSinceDayOf(
  ordered: CardPriceHistoryPoint[],
  priceKey: CardPriceHistoryPriceKey,
): string | null {
  let sinceDay: string | null = null;
  let previousValue: number | null = null;
  for (const point of ordered) {
    const value = point[priceKey];
    if (value != null && value !== previousValue) sinceDay = point.day;
    previousValue = value;
  }
  return previousValue == null ? null : sinceDay;
}

export function cardPriceHistorySeries(
  points: CardPriceHistoryPoint[],
  { source, isFoil, rangeDays, today }: CardPriceHistorySeriesOptions,
): CardPriceHistorySeries {
  const fields = PRICE_SOURCE_FIELDS[source];
  const isFoilPrice = isFoil && points.some((point) => point[fields.priceFoil] != null);
  const priceKey = isFoilPrice ? fields.priceFoil : fields.price;
  const ordered = points
    .filter((point) => point.day <= today)
    .sort((left, right) => left.day.localeCompare(right.day));
  const firstPriced = ordered.find((point) => point[priceKey] != null);
  if (!firstPriced) return { days: [], isFoilPrice, currentPriceSinceDay: null };

  const rangeStart = addDaysToUtcDay(today, -(rangeDays - 1));
  const firstDay = firstPriced.day > rangeStart ? firstPriced.day : rangeStart;
  const days: CardPriceHistoryDay[] = [];
  let pointIndex = 0;
  let value: number | null = null;
  for (let day = firstDay; day <= today; day = addDaysToUtcDay(day, 1)) {
    while (pointIndex < ordered.length && ordered[pointIndex].day <= day) {
      value = ordered[pointIndex][priceKey];
      pointIndex += 1;
    }
    if (value != null) days.push({ day, value });
  }
  const priceChangedInRange = days.some((entry) => entry.value !== days[0].value);
  return {
    days: priceChangedInRange ? days : days.slice(-1),
    isFoilPrice,
    currentPriceSinceDay: currentPriceSinceDayOf(ordered, priceKey),
  };
}
