import type { ScanStats } from "@/lib/interfaces/scanner";
import type { WrappedSlide } from "@/lib/interfaces/cards";

export function buildWrappedSlides(
  stats: ScanStats | null,
  elapsedMs: number,
  wrappedEnabled = true,
): WrappedSlide[] {
  if (!wrappedEnabled) return [{ key: "outro", type: "outro" }];

  const slides: WrappedSlide[] = [{ key: "intro", type: "intro" }];
  if (!stats) {
    slides.push({ key: "outro", type: "outro" });
    return slides;
  }

  slides.push({ key: "total", type: "total", count: stats.totalCount });
  slides.push({
    key: "unique",
    type: "unique",
    uniqueCount: stats.uniqueCount,
    totalCount: stats.totalCount,
  });

  const topSet = stats.sets[0];
  if (topSet) {
    slides.push({
      key: "set",
      type: "set",
      name: topSet.name,
      count: topSet.count,
    });
  }

  if (stats.rarities.length > 0) {
    slides.push({
      key: "rarity",
      type: "rarity",
      rarities: stats.rarities,
      total: stats.totalCount,
    });
  }

  const topColor = stats.colors[0];
  if (topColor) {
    slides.push({
      key: "color",
      type: "color",
      label: topColor.label,
      bg: topColor.bg,
      count: topColor.count,
      total: stats.totalCount,
    });
  }

  if (stats.mostValuable) {
    slides.push({
      key: "mvp",
      type: "mvp",
      name: stats.mostValuable.name,
      price: stats.mostValuable.price,
    });
  }

  if (stats.hasPricing) {
    slides.push({
      key: "value",
      type: "value",
      totalValue: stats.totalValue,
      avgValue: stats.avgValue,
    });
  }

  const cardsPerHour =
    elapsedMs > 0
      ? Math.round((stats.totalCount / elapsedMs) * 3_600_000)
      : null;
  slides.push({ key: "speed", type: "speed", cardsPerHour, elapsedMs });

  slides.push({ key: "outro", type: "outro" });
  return slides;
}
