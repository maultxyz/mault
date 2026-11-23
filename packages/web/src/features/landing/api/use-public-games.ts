import { loadPublicResource } from "@/features/landing/api/load-public-resource";
import type { PublicGame } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export function usePublicGames() {
  const [games, setGames] = useState<PublicGame[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadPublicResource<PublicGame[]>("/api/public/games")
      .then((res) => {
        if (cancelled) return;
        setGames(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return games;
}
