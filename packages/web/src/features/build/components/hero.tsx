import { Button } from "@/components/ui/button";
import {
  BOARD_INFO,
  KIT_BOARD_TYPE,
  KIT_MODULE_COUNT,
} from "@/lib/constants/build";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useEsp32MountType } from "@/features/build/api/use-esp32-mount-type";
import { useKitMode } from "@/features/build/api/use-kit-mode";
import { useModuleCount } from "@/features/build/api/use-module-count";
import { IconCheck, IconPackage } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";

export function BuildHero() {
  const { t } = useTranslation("build");
  const { moduleCount, setModuleCount } = useModuleCount();
  const { boardType, setBoardType } = useBoardType();
  const { setMountType } = useEsp32MountType();
  const { usingKit, setUsingKit } = useKitMode();
  const board = BOARD_INFO[boardType];

  const toggleKit = () => {
    if (!usingKit) {
      setModuleCount(KIT_MODULE_COUNT);
      setBoardType(KIT_BOARD_TYPE);
      setMountType("breakout");
    }
    setUsingKit(!usingKit);
  };

  const catchAllBin = moduleCount * 2 + 1;
  const moduleBins = Array.from({ length: moduleCount }, (_, i) => [
    i * 2 + 2,
    i * 2 + 1,
  ]);

  return (
    <section className="mx-auto max-w-4xl px-4 pt-12 pb-16">
      <div className="mb-10 flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <IconPackage size={16} />
          </span>
          <div>
            <p className="text-sm font-medium">{t("hero.kit.title")}</p>
            <p className="mt-0.5 text-sm/relaxed text-foreground/70">
              {usingKit
                ? t("hero.kit.activeDescription")
                : t("hero.kit.description")}
            </p>
          </div>
        </div>
        <Button
          variant={usingKit ? "default" : "outline"}
          aria-pressed={usingKit}
          onClick={toggleKit}
          className="shrink-0"
        >
          {usingKit && <IconCheck />}
          {usingKit ? t("hero.kit.active") : t("hero.kit.button")}
        </Button>
      </div>

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

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-foreground/70">
        <span>
          {t("hero.firmwareLabel")}{" "}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
            firmware/main/main.ino
          </code>
        </span>
        <span>
          {t("hero.enclosureLabel")}{" "}
          <a
            href="https://github.com/dishwasher-detergent/mault/blob/master/3d%20model/Card%20Sorter.f3d"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground hover:bg-secondary"
          >
            <code>3d model/Card Sorter.f3d</code>
          </a>
        </span>
        <span>
          {t("hero.calibrationLabel")}{" "}
          <code className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
            /app/calibrate
          </code>
        </span>
      </div>

      <div className="mt-10 overflow-hidden rounded-lg border bg-card">
        <div className="divide-y divide-border">
          <p className="p-5 text-sm/relaxed text-foreground/70 md:p-6">
            <Trans
              t={t}
              i18nKey="hero.modulesIntro"
              components={[
                <strong key="0" className="font-medium text-foreground" />,
                <strong key="1" className="font-medium text-foreground" />,
                <strong key="2" className="font-medium text-foreground" />,
              ]}
            />
          </p>

          {moduleBins.map((bins, i) => (
            <div
              key={i}
              className="grid grid-cols-[110px_1fr_1fr] divide-x divide-border"
            >
              <div className="flex items-center justify-center bg-secondary/40 px-3 py-3 font-mono text-sm font-medium">
                {t("hero.moduleLabel", { n: i + 1 })}
              </div>
              {bins.map((bin) => (
                <div
                  key={bin}
                  className="flex items-center justify-center dark:bg-primary/15 bg-primary/5 px-3 py-3 font-mono text-sm font-semibold dark:text-primary-foreground text-primary"
                >
                  {t("hero.binLabel", { n: bin })}
                </div>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-[110px_1fr] divide-x divide-border">
            <div className="bg-secondary/20" />
            <div className="flex items-center justify-center gap-2 dark:bg-primary/15 bg-primary/5 px-3 py-3 font-mono text-sm font-semibold dark:text-primary-foreground text-primary">
              {t("hero.binLabel", { n: catchAllBin })}
              <span className="font-sans text-[10px] font-normal dark:text-primary-foreground/70 text-primary/70">
                - {t("hero.catchAllBinNote", { modules: moduleCount })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
