import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { BuildTableOfContents } from "@/features/build/components/table-of-contents";
import { BOARD_INFO } from "@/lib/constants/build";
import { useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType } = useBuildSetup();
  const board = BOARD_INFO[boardType];
  const catchAllBin = moduleCount * 2 + 1;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-8 pb-2">
      <p className="text-sm font-semibold text-primary">{t("hero.eyebrow")}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
        {t("hero.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("hero.description", {
          board: board.displayName,
          modules: moduleCount,
          bins: catchAllBin,
        })}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-foreground/70">
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

      <BuildTableOfContents />
    </section>
  );
}
