import { publicGet } from "@/lib/api/client";
import type { PublicGame, Result } from "@magic-vault/shared";
import { useEffect, useState } from "react";

export function usePublicGames() {
  const [games, setGames] = useState<PublicGame[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    publicGet<Result<PublicGame[]>>("/api/public/games")
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
