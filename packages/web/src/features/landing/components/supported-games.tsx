import { usePublicGames } from "@/features/landing/api/use-public-games";
import {
  GAMES_MARQUEE_MIN_ITEMS,
  GAMES_MARQUEE_SECONDS_PER_ITEM,
} from "@/lib/constants/landing";
import type { PublicGame } from "@magic-vault/shared";
import { cn } from "@/lib/utils";
import { useId, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

function repeatToFill(games: PublicGame[]): PublicGame[] {
  const filled: PublicGame[] = [];
  while (filled.length < GAMES_MARQUEE_MIN_ITEMS) filled.push(...games);
  return filled;
}

export function LandingSupportedGames() {
  const { t, i18n } = useTranslation("landing");
  const games = usePublicGames();
  const [isPaused, setIsPaused] = useState(false);
  const pauseHintId = useId();

  if (games !== null && games.length === 0) return null;

  const items = games ? repeatToFill(games) : [];

  const togglePauseOnSpace = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== " " || event.target !== event.currentTarget) return;
    event.preventDefault();
    setIsPaused((paused) => !paused);
  };

  const renderRow = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-14 pr-14"
    >
      {items.map((game, index) => (
        <li
          key={`${game.key}-${index}`}
          className="flex items-baseline gap-2.5"
        >
          <span className="font-heading text-base font-semibold whitespace-nowrap text-foreground/80 md:text-lg">
            {game.name}
          </span>
          <span className="font-heading text-2xs whitespace-nowrap text-foreground/70 tabular-nums">
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
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-8 md:pb-12">
      <p aria-hidden className="text-center text-sm text-foreground/70">
        {t("supportedGames.heading")}
      </p>
      <section
        role="marquee"
        aria-label={t("supportedGames.heading")}
        aria-describedby={games ? pauseHintId : undefined}
        tabIndex={games ? 0 : undefined}
        onKeyDown={togglePauseOnSpace}
        className="overflow-hidden rounded-lg py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
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
            className={cn(
              "flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none",
              isPaused && "[animation-play-state:paused]",
            )}
            style={{
              ["--marquee-duration" as string]: `${items.length * GAMES_MARQUEE_SECONDS_PER_ITEM}s`,
            }}
          >
            {renderRow(false)}
            {renderRow(true)}
          </div>
        )}
        {games && (
          <p id={pauseHintId} className="sr-only" aria-live="polite">
            {isPaused
              ? t("supportedGames.pausedHint")
              : t("supportedGames.pauseHint")}
          </p>
        )}
      </section>
    </div>
  );
}
