import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_CONTENT_ID } from "@/lib/constants/a11y";
import { CARD_GRID_CLASS } from "@/lib/constants/card-grid";
import {
  PUBLIC_CARDS_LOADING_FILTER_GROUP_COUNT,
  PUBLIC_CARDS_LOADING_FILTER_OPTION_COUNT,
  PUBLIC_CARDS_LOADING_TILE_COUNT,
} from "@/lib/constants/public-cards";
import { useTranslation } from "react-i18next";

export function PublicCardsLoadingScreen() {
  const { t } = useTranslation("common");

  return (
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex h-dvh flex-col bg-background outline-none"
    >
      <span role="status" className="sr-only">
        {t("a11y.loading")}
      </span>
      <header className="grid shrink-0 grid-cols-1 items-center gap-3 border-b px-4 py-3 md:px-3 md:py-2 md:grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <Skeleton className="h-10 min-w-0 flex-1 rounded-lg md:h-7" />
          <Skeleton className="size-10 shrink-0 rounded-lg md:hidden" />
        </div>
        <div className="hidden items-center gap-1.5 md:flex md:justify-end">
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside
          aria-hidden
          className="hidden w-64 shrink-0 border-r bg-muted p-4 md:flex md:flex-col md:gap-5 lg:w-72"
        >
          {Array.from({ length: PUBLIC_CARDS_LOADING_FILTER_GROUP_COUNT }, (_, groupIndex) => (
            <div key={groupIndex} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              {Array.from({ length: PUBLIC_CARDS_LOADING_FILTER_OPTION_COUNT }, (_, optionIndex) => (
                <Skeleton key={optionIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </aside>
        <div className="@container min-w-0 flex-1 overflow-hidden p-4 md:px-3 md:py-2">
          <div className={CARD_GRID_CLASS}>
            {Array.from({ length: PUBLIC_CARDS_LOADING_TILE_COUNT }, (_, tileIndex) => (
              <div key={tileIndex} className="flex flex-col gap-1.5">
                <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <footer
        aria-hidden
        className="flex shrink-0 items-center justify-center bg-black px-4 py-1.5 dark:border-t md:justify-end md:px-3 md:py-1"
      >
        <span className="h-4 w-36 rounded-sm bg-white/20" />
      </footer>
    </main>
  );
}
