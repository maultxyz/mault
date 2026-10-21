import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/option-card";
import { BuildSectionHeader } from "@/features/build/components/section-header";
import {
  BOARD_ICONS,
  BOARD_INFO,
  BOARD_TYPES,
  BUILD_SETUP_ANCHOR,
  DEFAULT_ESP32_MOUNT_TYPE,
  ESP32_MOUNT_ICONS,
  ESP32_MOUNT_TYPES,
  KIT_BOARD_TYPE,
  KIT_MODULE_COUNT,
  MAX_MODULES,
  MIN_MODULES,
} from "@/lib/constants/build";
import type { BuildSetupStepProps } from "@/lib/interfaces/build";
import {
  IconLock,
  IconMinus,
  IconPackage,
  IconPlus,
  IconTool,
} from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";

function SetupStep({ step, label, hint, children }: BuildSetupStepProps) {
  return (
    <div className="group/step flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid size-6 shrink-0 place-items-center rounded-sm border border-primary font-heading text-2xs font-semibold text-primary">
          {String(step).padStart(2, "0")}
        </span>
        <span
          aria-hidden
          className="my-1.5 w-px flex-1 bg-border group-last/step:hidden"
        />
      </div>
      <div className="min-w-0 flex-1 pb-5 group-last/step:pb-0">
        <h3 className="font-heading text-sm font-semibold">{label}</h3>
        {hint && (
          <div className="mt-0.5 text-sm/relaxed text-foreground/70">
            {hint}
          </div>
        )}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export function BuildSetup() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType, mountType, usingKit, updateSetup } =
    useBuildSetup();
  const isEsp32 = boardType === "esp32";

  const chooseKit = () => {
    updateSetup({
      moduleCount: KIT_MODULE_COUNT,
      boardType: KIT_BOARD_TYPE,
      mountType: DEFAULT_ESP32_MOUNT_TYPE,
      usingKit: true,
    });
  };

  const catchAllBin = moduleCount * 2 + 1;
  const moduleBins = Array.from({ length: moduleCount }, (_, i) => [
    i * 2 + 2,
    i * 2 + 1,
  ]);
  const moduleStep = isEsp32 ? 4 : 3;

  return (
    <section
      id={BUILD_SETUP_ANCHOR}
      className="mx-auto max-w-4xl scroll-mt-14 px-4 py-10"
    >
      <BuildSectionHeader
        id={BUILD_SETUP_ANCHOR}
        step="01"
        eyebrow={t("hero.nav.setup")}
        heading={t("setup.heading")}
      >
        <p className="text-sm/relaxed text-foreground/70">
          {t("setup.description")}
        </p>
      </BuildSectionHeader>

      <div className="mt-6 flex flex-col">
        <SetupStep step={1} label={t("setup.source.label")}>
          <div
            role="radiogroup"
            aria-label={t("setup.source.label")}
            className="grid gap-2 sm:grid-cols-2"
          >
            <OptionCard
              icon={IconPackage}
              title={t("setup.source.kit.title")}
              description={t("setup.source.kit.description")}
              selected={usingKit}
              onSelect={chooseKit}
            />
            <OptionCard
              icon={IconTool}
              title={t("setup.source.diy.title")}
              description={t("setup.source.diy.description")}
              selected={!usingKit}
              onSelect={() => updateSetup({ usingKit: false })}
            />
          </div>
        </SetupStep>

        <SetupStep
          step={2}
          label={t("setup.board.label")}
          hint={
            usingKit && (
              <span className="inline-flex items-center gap-1.5">
                <IconLock className="size-4 shrink-0" />
                {t("setup.board.kitLocked")}
              </span>
            )
          }
        >
          <div
            role="radiogroup"
            aria-label={t("setup.board.label")}
            className="grid gap-2 sm:grid-cols-2"
          >
            {BOARD_TYPES.map((type) => (
              <OptionCard
                key={type}
                icon={BOARD_ICONS[type]}
                title={BOARD_INFO[type].displayName}
                description={t(`setup.board.${type}.description`)}
                selected={boardType === type}
                disabled={usingKit}
                onSelect={() => updateSetup({ boardType: type })}
              />
            ))}
          </div>
        </SetupStep>

        {isEsp32 && (
          <SetupStep step={3} label={t("setup.mount.label")}>
            <div
              role="radiogroup"
              aria-label={t("setup.mount.label")}
              className="grid gap-2 sm:grid-cols-2"
            >
              {ESP32_MOUNT_TYPES.map((type) => (
                <OptionCard
                  key={type}
                  icon={ESP32_MOUNT_ICONS[type]}
                  title={t(`setup.mount.${type}.title`)}
                  description={t(`setup.mount.${type}.description`)}
                  selected={mountType === type}
                  disabled={usingKit}
                  onSelect={() => updateSetup({ mountType: type })}
                />
              ))}
            </div>
          </SetupStep>
        )}

        <SetupStep
          step={moduleStep}
          label={t("setup.modules.label")}
          hint={t("setup.modules.description", { bins: catchAllBin })}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex w-fit items-center gap-1.5 rounded-lg border bg-background p-0.5">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("setup.modules.decreaseAria")}
                disabled={moduleCount <= MIN_MODULES}
                onClick={() => updateSetup({ moduleCount: moduleCount - 1 })}
              >
                <IconMinus />
              </Button>
              <span className="w-7 text-center font-mono text-base font-semibold tabular-nums">
                {moduleCount}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("setup.modules.increaseAria")}
                disabled={moduleCount >= MAX_MODULES}
                onClick={() => updateSetup({ moduleCount: moduleCount + 1 })}
              >
                <IconPlus />
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="divide-y divide-border">
                {moduleBins.map((bins, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[96px_1fr_1fr] divide-x divide-border"
                  >
                    <div className="flex items-center justify-center bg-secondary/40 px-2.5 py-1.5 font-mono text-sm font-medium">
                      {t("hero.moduleLabel", { n: i + 1 })}
                    </div>
                    {bins.map((bin) => (
                      <div
                        key={bin}
                        className="flex items-center justify-center bg-primary/5 px-2.5 py-1.5 font-mono text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-foreground"
                      >
                        {t("hero.binLabel", { n: bin })}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-[96px_1fr] divide-x divide-border">
                  <div className="bg-secondary/20" />
                  <div className="flex flex-wrap items-center justify-center gap-x-2 bg-primary/5 px-2.5 py-1.5 font-mono text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-foreground">
                    {t("hero.binLabel", { n: catchAllBin })}
                    <span className="font-sans text-sm font-normal text-primary/80 dark:text-primary-foreground/80">
                      {t("hero.catchAllBinNote", { modules: moduleCount })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm/relaxed text-foreground/70">
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
          </div>
        </SetupStep>
      </div>
    </section>
  );
}
