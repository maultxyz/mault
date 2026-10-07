import { usePublicGames } from "@/features/landing/api/use-public-games";
import { usePublicTotalScanned } from "@/features/landing/api/use-public-total-scanned";
import { useTranslation } from "react-i18next";

export function useLandingStats() {
  const { i18n } = useTranslation();
  const games = usePublicGames();
  const totalScanned = usePublicTotalScanned();

  return [
    {
      key: "totalScanned",
      value:
        totalScanned === null
          ? "–"
          : totalScanned.toLocaleString(i18n.language),
    },
    { key: "bins", value: "11" },
    { key: "games", value: games === null ? "–" : String(games.length) },
    { key: "collections", value: "∞" },
    { key: "cardsPerHour", value: "1,000" },
  ] as const;
}
