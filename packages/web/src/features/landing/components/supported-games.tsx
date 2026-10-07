import { usePublicGames } from "@/features/landing/api/use-public-games";
import {
  GAMES_MARQUEE_MIN_ITEMS,
  GAMES_MARQUEE_SECONDS_PER_ITEM,
} from "@/lib/constants/landing";
import type { PublicGame } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function repeatToFill(games: PublicGame[]): PublicGame[] {
  const filled: PublicGame[] = [];
  while (filled.length < GAMES_MARQUEE_MIN_ITEMS) filled.push(...games);
  return filled;
}

export function LandingSupportedGames() {
  const { t, i18n } = useTranslation("landing");
  const games = usePublicGames();

  if (games !== null && games.length === 0) return null;

  const items = games ? repeatToFill(games) : [];

  const renderRow = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-10 pr-10"
    >
      {items.map((game, index) => (
        <li key={`${game.key}-${index}`} className="flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="font-heading text-base font-semibold whitespace-nowrap md:text-lg">
            {game.name}
          </span>
          <span className="text-sm whitespace-nowrap text-foreground/70 tabular-nums">
            {t("supportedGames.cardsIndexed", {
              count: game.cardCount,
              formatted: game.cardCount.toLocaleString(i18n.language),
            })}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label={t("supportedGames.heading")}
      className="overflow-hidden border-y bg-secondary/30 py-5 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      {games === null ? (
        <div className="flex justify-center gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-5 w-40 animate-pulse rounded-sm bg-muted"
            />
          ))}
        </div>
      ) : (
        <div
          className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
          style={{
            ["--marquee-duration" as string]: `${items.length * GAMES_MARQUEE_SECONDS_PER_ITEM}s`,
          }}
        >
          {renderRow(false)}
          {renderRow(true)}
        </div>
      )}
    </section>
  );
}
