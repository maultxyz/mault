import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useBuildChecklist } from "@/features/build/api/use-build-checklist";
import { useBuildPhases } from "@/features/build/api/use-build-phases";
import { AnchorLinkButton } from "@/features/build/components/anchor-link-button";
import { PhaseVideo } from "@/features/build/components/phase-video";
import { BuildSelectionSummary } from "@/features/build/components/selection-summary";
import { phaseAnchorId, stepAnchorId } from "@/features/build/lib/anchors";
import {
  BUILD_ASSEMBLY_ANCHOR,
  BUILD_OPTIONAL_BADGE_CLASS,
} from "@/lib/constants/build";
import { DISCORD_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import { IconVideo } from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";

export function BuildAssembly() {
  const { t } = useTranslation("build");
  const { checked, toggle } = useBuildChecklist();
  const PHASES = useBuildPhases();

  const allSteps = useMemo(() => PHASES.flatMap((p) => p.steps), [PHASES]);
  const doneCount = allSteps.filter((s) => checked[s.key]).length;
  const pct = allSteps.length
    ? Math.round((doneCount / allSteps.length) * 100)
    : 0;

  return (
    <section
      id={BUILD_ASSEMBLY_ANCHOR}
      className="mx-auto max-w-7xl scroll-mt-14 px-4 py-8"
    >
      <div className="group/anchor flex items-center gap-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
          {t("assembly.heading")}
        </h2>
        <AnchorLinkButton id={BUILD_ASSEMBLY_ANCHOR} />
      </div>
      <p className="mt-1.5 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("assembly.description")}
      </p>
      <p className="mt-1 max-w-2xl text-sm/relaxed text-foreground/70">
        <Trans
          t={t}
          i18nKey="assembly.helpText"
          components={{
            a: (
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              />
            ),
          }}
        />
      </p>

      <BuildSelectionSummary />

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between font-mono text-sm text-foreground/70">
          <span>
            {t("assembly.progress.stepsCount", {
              done: doneCount,
              total: allSteps.length,
            })}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {PHASES.map((phase, i) => {
          const hasVideos = !!phase.video;
          return (
            <div
              key={phase.key}
              className={cn(
                "flex flex-col gap-4",
                hasVideos && "lg:flex-row lg:items-start",
              )}
            >
              {phase.video && (
                <div className="lg:sticky lg:top-20 lg:w-1/2 lg:shrink-0">
                  <PhaseVideo video={phase.video} />
                </div>
              )}
              <div
                id={phaseAnchorId(phase.key)}
                className="min-w-0 flex-1 scroll-mt-16 rounded-lg border bg-card dark:border-foreground/15"
              >
                <div className="group/anchor sticky top-14 z-10 flex items-center gap-3 rounded-t-lg border-b bg-secondary px-3 py-2 md:px-4 dark:border-foreground/15">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary dark:bg-primary dark:text-primary-foreground">
                    <phase.icon size={16} />
                  </span>
                  <div className="flex flex-col items-baseline">
                    <span className="font-mono text-xs font-semibold tracking-wide text-foreground/70 uppercase">
                      {t("assembly.phaseLabel", { n: i + 1 })}
                    </span>
                    <h3 className="font-heading text-sm font-semibold">
                      {phase.title}
                    </h3>
                  </div>
                  <AnchorLinkButton id={phaseAnchorId(phase.key)} />
                  {hasVideos && (
                    <IconVideo
                      size={16}
                      className="ml-auto shrink-0 text-foreground/70"
                      aria-label={t("assembly.hasVideoAria")}
                    />
                  )}
                </div>
                <div className="flex flex-col divide-y divide-dashed divide-border px-3 py-3 md:px-4 dark:divide-foreground/15">
                  {phase.intro}
                  {phase.steps.map((step) => (
                    <div
                      key={step.key}
                      id={stepAnchorId(step.key)}
                      className="flex scroll-mt-32 flex-col gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <label
                        htmlFor={step.key}
                        className="group/anchor flex cursor-pointer items-start gap-2.5"
                      >
                        <Checkbox
                          id={step.key}
                          checked={!!checked[step.key]}
                          onCheckedChange={() => toggle(step.key)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm/relaxed",
                              checked[step.key] &&
                                "text-foreground/70 line-through decoration-foreground/70",
                            )}
                          >
                            {step.text}
                            {step.optional && (
                              <Badge className={BUILD_OPTIONAL_BADGE_CLASS}>
                                {t("optionalBadge")}
                              </Badge>
                            )}
                          </p>
                          {step.note && (
                            <p className="mt-0.5 text-sm/relaxed text-foreground/70">
                              {step.note}
                            </p>
                          )}
                          {step.images && step.images.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {step.images.map((src) => (
                                <img
                                  key={src}
                                  src={src}
                                  alt=""
                                  className="w-full max-w-32 rounded-md border sm:max-w-56"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <AnchorLinkButton
                          id={stepAnchorId(step.key)}
                          className="-my-1"
                        />
                      </label>
                      {step.reference && (
                        <div className="sm:pl-7">{step.reference}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
