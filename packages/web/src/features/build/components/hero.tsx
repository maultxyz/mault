import { BOARD_INFO, BUILD_SECTION_NAV } from "@/lib/constants/build";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useModuleCount } from "@/features/build/api/use-module-count";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();
  const board = BOARD_INFO[boardType];
  const catchAllBin = moduleCount * 2 + 1;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 pb-4">
      <p className="text-sm font-semibold text-primary">
        {t("hero.eyebrow")}
      </p>
      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
        {t("hero.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-sm/relaxed text-foreground/70 md:text-base/relaxed">
        {t("hero.description", {
          board: board.displayName,
          modules: moduleCount,
          bins: catchAllBin,
        })}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-xs text-foreground/70">
        <span>
          {t("hero.firmwareLabel")}{" "}
          <code className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-foreground">
            firmware/main/main.ino
          </code>
        </span>
        <span>
          {t("hero.enclosureLabel")}{" "}
          <a
            href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-foreground hover:bg-secondary"
          >
            <code>3d model/Card Sorter.f3d</code>
          </a>
        </span>
        <span>
          {t("hero.calibrationLabel")}{" "}
          <code className="rounded-sm border border-border bg-muted px-1.5 py-0.5 text-foreground">
            /app/calibrate
          </code>
        </span>
      </div>

      <nav
        aria-label={t("hero.nav.label")}
        className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border sm:flex sm:w-fit"
      >
        {BUILD_SECTION_NAV.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="flex items-center gap-2 bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-primary sm:px-4"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-muted font-mono text-sm text-foreground">
              {i + 1}
            </span>
            {t(item.labelKey)}
          </a>
        ))}
      </nav>
    </section>
  );
}
