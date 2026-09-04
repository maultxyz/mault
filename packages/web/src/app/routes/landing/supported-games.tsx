import { useTranslation } from "react-i18next";
import { usePublicGames } from "@/app/routes/landing/use-public-games";
import { LANGUAGE_LABELS } from "@/lib/languages";

export function LandingSupportedGames() {
  const { t } = useTranslation("landing");
  const games = usePublicGames();

  if (games !== null && games.length === 0) return null;

  return (
    <section className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
            {t("supportedGames.heading")}
          </h2>
          <p className="mt-3 text-sm/relaxed text-foreground/70 md:text-base/relaxed">
            {t("supportedGames.subtitle")}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-12 gap-y-8">
          {games === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))
            : games.map((game) => (
                <div key={game.key} className="flex flex-col gap-0.5">
                  <span className="font-heading text-base font-semibold text-foreground md:text-lg">
                    {game.name}
                  </span>
                  <span className="text-sm text-foreground/70 tabular-nums">
                    {t("supportedGames.cardsIndexed", {
                      count: game.cardCount,
                      formatted: game.cardCount.toLocaleString(),
                    })}
                  </span>
                  {game.languages.length > 0 && (
                    <span className="text-sm text-foreground/70">
                      {game.languages
                        .map((lang) => LANGUAGE_LABELS[lang] ?? lang)
                        .join(", ")}
                    </span>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
