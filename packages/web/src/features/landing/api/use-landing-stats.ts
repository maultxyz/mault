import { usePublicGames } from "@/features/landing/api/use-public-games";

export function useLandingStats() {
  const games = usePublicGames();

  return [
    { key: "bins", value: "11" },
    { key: "games", value: games === null ? "–" : String(games.length) },
    { key: "collections", value: "∞" },
    { key: "cardsPerHour", value: "800" },
  ] as const;
}
