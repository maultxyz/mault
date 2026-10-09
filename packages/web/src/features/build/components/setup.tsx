import { Button } from "@/components/ui/button";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useEsp32MountType } from "@/features/build/api/use-esp32-mount-type";
import { useKitMode } from "@/features/build/api/use-kit-mode";
import { useModuleCount } from "@/features/build/api/use-module-count";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import { BuildOptionCard } from "@/features/build/components/option-card";
import {
  BOARD_ICONS,
  BOARD_INFO,
  BOARD_TYPES,
  BUILD_SETUP_ANCHOR,
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
    <div className="group/step flex gap-4">
      <div className="flex flex-col items-center">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-foreground">
          {step}
        </span>
        <span
          aria-hidden
          className="my-2 w-0.5 flex-1 bg-primary/25 group-last/step:hidden"
        />
      </div>
      <div className="min-w-0 flex-1 pb-10 group-last/step:pb-0">
        <h3 className="pt-0.5 font-heading text-base font-semibold">
          {label}
        </h3>
        {hint && (
          <div className="mt-0.5 text-sm/relaxed text-foreground/70">
            {hint}
          </div>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export function BuildSetup() {
  const { t } = useTranslation("build");
  const { moduleCount, setModuleCount } = useModuleCount();
  const { boardType, setBoardType } = useBoardType();
  const { mountType, setMountType } = useEsp32MountType();
  const { usingKit, setUsingKit } = useKitMode();
  const isEsp32 = boardType === "esp32";

  const chooseKit = () => {
    setModuleCount(KIT_MODULE_COUNT);
    setBoardType(KIT_BOARD_TYPE);
    setMountType("breakout");
    setUsingKit(true);
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
      className="mx-auto max-w-4xl scroll-mt-14 px-4 py-16"
    >
      <div className="group/anchor flex items-center gap-1">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {t("setup.heading")}
        </h2>
        <AnchorLinkButton id={BUILD_SETUP_ANCHOR} />
      </div>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("setup.description")}
      </p>

      <div className="mt-8 flex flex-col">
        <SetupStep step={1} label={t("setup.source.label")}>
          <div
            role="radiogroup"
            aria-label={t("setup.source.label")}
            className="grid gap-3 sm:grid-cols-2"
          >
            <BuildOptionCard
              icon={IconPackage}
              title={t("setup.source.kit.title")}
              description={t("setup.source.kit.description")}
              selected={usingKit}
              onSelect={chooseKit}
            />
            <BuildOptionCard
              icon={IconTool}
              title={t("setup.source.diy.title")}
              description={t("setup.source.diy.description")}
              selected={!usingKit}
              onSelect={() => setUsingKit(false)}
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
            className="grid gap-3 sm:grid-cols-2"
          >
            {BOARD_TYPES.map((type) => (
              <BuildOptionCard
                key={type}
                icon={BOARD_ICONS[type]}
                title={BOARD_INFO[type].displayName}
                description={t(`setup.board.${type}.description`)}
                selected={boardType === type}
                disabled={usingKit}
                onSelect={() => setBoardType(type)}
              />
            ))}
          </div>
        </SetupStep>

        {isEsp32 && (
          <SetupStep step={3} label={t("setup.mount.label")}>
            <div
              role="radiogroup"
              aria-label={t("setup.mount.label")}
              className="grid gap-3 sm:grid-cols-2"
            >
              {ESP32_MOUNT_TYPES.map((type) => (
                <BuildOptionCard
                  key={type}
                  icon={ESP32_MOUNT_ICONS[type]}
                  title={t(`setup.mount.${type}.title`)}
                  description={t(`setup.mount.${type}.description`)}
                  selected={mountType === type}
                  disabled={usingKit}
                  onSelect={() => setMountType(type)}
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
          <div className="flex flex-col gap-4">
            <div className="flex w-fit items-center gap-2 rounded-lg border bg-background p-1">
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("setup.modules.decreaseAria")}
                disabled={moduleCount <= MIN_MODULES}
                onClick={() => setModuleCount(moduleCount - 1)}
              >
                <IconMinus />
              </Button>
              <span className="w-8 text-center font-mono text-lg font-semibold tabular-nums">
                {moduleCount}
              </span>
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("setup.modules.increaseAria")}
                disabled={moduleCount >= MAX_MODULES}
                onClick={() => setModuleCount(moduleCount + 1)}
              >
                <IconPlus />
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="divide-y divide-border">
                {moduleBins.map((bins, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[110px_1fr_1fr] divide-x divide-border"
                  >
                    <div className="flex items-center justify-center bg-secondary/40 px-3 py-2.5 font-mono text-sm font-medium">
                      {t("hero.moduleLabel", { n: i + 1 })}
                    </div>
                    {bins.map((bin) => (
                      <div
                        key={bin}
                        className="flex items-center justify-center bg-primary/5 px-3 py-2.5 font-mono text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-foreground"
                      >
                        {t("hero.binLabel", { n: bin })}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="grid grid-cols-[110px_1fr] divide-x divide-border">
                  <div className="bg-secondary/20" />
                  <div className="flex flex-wrap items-center justify-center gap-x-2 bg-primary/5 px-3 py-2.5 font-mono text-sm font-semibold text-primary dark:bg-primary/15 dark:text-primary-foreground">
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
