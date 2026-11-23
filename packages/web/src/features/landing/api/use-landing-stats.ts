import { usePublicGames } from "@/features/landing/api/use-public-games";
import { usePublicMetrics } from "@/features/landing/api/use-public-metrics";
import { useTranslation } from "react-i18next";

export function useLandingStats() {
  const { i18n } = useTranslation();
  const games = usePublicGames();
  const metrics = usePublicMetrics();

  return [
    {
      key: "totalScanned",
      value:
        metrics === null
          ? "–"
          : metrics.totalScanned.toLocaleString(i18n.language),
    },
    {
      key: "totalCardValue",
      value:
        metrics?.totalCardValueCurrency == null ||
        metrics.totalCardValue == null
          ? "–"
          : new Intl.NumberFormat(i18n.language, {
              style: "currency",
              currency: metrics.totalCardValueCurrency,
              maximumFractionDigits: 0,
            }).format(metrics.totalCardValue),
    },
    { key: "bins", value: "11" },
    { key: "games", value: games === null ? "–" : String(games.length) },
    { key: "cardsPerHour", value: "1,000" },
  ] as const;
}
