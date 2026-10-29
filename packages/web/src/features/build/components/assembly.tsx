import { Badge } from "@/components/ui/badge";
import { useBuildChecklist } from "@/features/build/api/use-build-checklist";
import { useBuildPhases } from "@/features/build/api/use-build-phases";
import { AnchorLinkButton } from "@/components/guide/anchor-link-button";
import { PhaseVideo } from "@/features/build/components/phase-video";
import { GuideChecklistItem } from "@/components/guide/guide-checklist-item";
import { GuideProgress } from "@/components/guide/guide-progress";
import { GuideSectionHeader } from "@/components/guide/guide-section-header";
import { PrintPartImages } from "@/features/build/components/print-part-images";
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

  return (
    <section
      id={BUILD_ASSEMBLY_ANCHOR}
      className="mx-auto max-w-7xl scroll-mt-14 px-4 py-10"
    >
      <GuideSectionHeader
        id={BUILD_ASSEMBLY_ANCHOR}
        step="03"
        eyebrow={t("hero.nav.assembly")}
        heading={t("assembly.heading")}
      >
        <p className="text-sm/relaxed text-foreground/70">
          {t("assembly.description")}
        </p>
      </GuideSectionHeader>
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
        <GuideProgress
          label={t("assembly.progress.stepsCount", {
            done: doneCount,
            total: allSteps.length,
          })}
          done={doneCount}
          total={allSteps.length}
        />
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
                className="min-w-0 flex-1 scroll-mt-16 rounded-lg border bg-card"
              >
                <div className="group/anchor sticky top-14 z-10 flex items-center gap-3 rounded-t-lg border-b bg-card px-3 py-2 md:px-4">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-heading text-2xs font-medium tracking-widest text-primary uppercase">
                      {t("assembly.phaseLabel", {
                        n: String(i + 1).padStart(2, "0"),
                      })}
                    </span>
                    <h3 className="font-heading text-sm font-semibold">
                      {phase.title}
                    </h3>
                  </div>
                  <AnchorLinkButton id={phaseAnchorId(phase.key)} />
                  <div className="ml-auto flex shrink-0 items-center gap-2 text-foreground/70">
                    {hasVideos && (
                      <IconVideo
                        className="size-4"
                        aria-label={t("assembly.hasVideoAria")}
                      />
                    )}
                    <phase.icon className="size-4" />
                  </div>
                </div>
                <div className="flex flex-col divide-y divide-dashed divide-border px-3 py-3 md:px-4">
                  {phase.intro}
                  {phase.steps.map((step) => (
                    <div
                      key={step.key}
                      id={stepAnchorId(step.key)}
                      className="flex scroll-mt-32 flex-col gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <GuideChecklistItem
                        id={step.key}
                        checked={!!checked[step.key]}
                        onToggle={() => toggle(step.key)}
                        details={
                          <>
                            {step.note && (
                              <p className="mt-0.5 text-sm/relaxed text-foreground/70">
                                {step.note}
                              </p>
                            )}
                            {step.modelParts && (
                              <PrintPartImages parts={step.modelParts} />
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
                          </>
                        }
                        aside={
                          <AnchorLinkButton
                            id={stepAnchorId(step.key)}
                            className="-my-1"
                          />
                        }
                      >
                        {step.text}
                        {step.optional && (
                          <Badge className={BUILD_OPTIONAL_BADGE_CLASS}>
                            {t("optionalBadge")}
                          </Badge>
                        )}
                      </GuideChecklistItem>
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
