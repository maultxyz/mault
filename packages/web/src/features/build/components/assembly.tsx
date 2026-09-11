import { buttonVariants } from "@/components/ui/button";
import { useBoardType } from "@/features/build/api/use-board-type";
import { useBuildChecklist } from "@/features/build/api/use-build-checklist";
import { useEsp32MountType } from "@/features/build/api/use-esp32-mount-type";
import { useModuleCount } from "@/features/build/api/use-module-count";
import {
  buildPhases,
  getYouTubeVideoId,
  optionalBadgeLabel,
} from "@/features/build/lib/build-phases";
import { DISCORD_URL } from "@/lib/constants/links";
import { cn } from "@/lib/utils";
import { IconVideo } from "@tabler/icons-react";
import { useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";

export function BuildAssembly() {
  const { t } = useTranslation("build");
  const { checked, toggle } = useBuildChecklist();
  const { moduleCount } = useModuleCount();
  const { boardType } = useBoardType();
  const { mountType, setMountType } = useEsp32MountType();

  const PHASES = useMemo(
    () => buildPhases(t, moduleCount, boardType, mountType),
    [t, moduleCount, boardType, mountType],
  );

  const allSteps = useMemo(() => PHASES.flatMap((p) => p.steps), [PHASES]);
  const doneCount = allSteps.filter((s) => checked[s.key]).length;
  const pct = allSteps.length
    ? Math.round((doneCount / allSteps.length) * 100)
    : 0;

  return (
    <section id="assembly" className="mx-auto max-w-7xl px-4 py-16">
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {t("assembly.heading")}
      </h2>
      <p className="mt-3 max-w-2xl text-sm/relaxed text-foreground/70">
        {t("assembly.description")}
      </p>
      <p className="mt-2 max-w-2xl text-sm/relaxed text-foreground/70">
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

      {boardType === "esp32" && (
        <div className="mt-4 flex items-center gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-wide text-foreground/70 uppercase">
            {t("assembly.esp32MountType.label")}
          </span>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => setMountType("breakout")}
              className={cn(
                buttonVariants({
                  variant: mountType === "breakout" ? "secondary" : "ghost",
                  size: "sm",
                }),
                mountType !== "breakout" && "text-foreground/70",
              )}
            >
              {t("assembly.esp32MountType.breakout")}
            </button>
            <button
              type="button"
              onClick={() => setMountType("bare")}
              className={cn(
                buttonVariants({
                  variant: mountType === "bare" ? "secondary" : "ghost",
                  size: "sm",
                }),
                mountType !== "bare" && "text-foreground/70",
              )}
            >
              {t("assembly.esp32MountType.bare")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-foreground/70">
          <span>
            {t("assembly.progress.stepsCount", {
              done: doneCount,
              total: allSteps.length,
            })}
          </span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/50">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {PHASES.map((phase, i) => {
          const videoIds = (phase.videos ?? [])
            .map((url) => [url, getYouTubeVideoId(url)] as const)
            .filter((pair): pair is [string, string] => pair[1] !== null);
          const hasVideos = videoIds.length > 0;
          return (
            <div
              key={phase.key}
              className={cn(
                "flex flex-col gap-6",
                hasVideos && "lg:flex-row lg:items-start",
              )}
            >
              {hasVideos && (
                <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:w-3/5 lg:shrink-0">
                  {videoIds.map(([url, id]) => (
                    <div
                      key={url}
                      className="aspect-video w-full overflow-hidden rounded-lg border bg-black"
                    >
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${id}`}
                        title={t("assembly.videoTitle")}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        loading="lazy"
                        className="size-full"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="min-w-0 flex-1 rounded-lg border bg-card">
                <div className="sticky top-14 z-10 flex items-center gap-3 rounded-t-lg border-b bg-secondary px-4 py-3 md:px-5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <phase.icon size={16} />
                  </span>
                  <div className="flex flex-col items-baseline">
                    <span className="font-mono text-[10px] font-semibold tracking-wide text-foreground/70 uppercase">
                      {t("assembly.phaseLabel", { n: i + 1 })}
                    </span>
                    <h3 className="font-heading text-sm font-semibold">
                      {phase.title}
                    </h3>
                  </div>
                  {hasVideos && (
                    <IconVideo
                      size={16}
                      className="ml-auto shrink-0 text-foreground/70"
                      aria-label={t("assembly.hasVideoAria")}
                    />
                  )}
                </div>
                <div className="flex flex-col divide-y divide-dashed divide-border px-4 py-4 md:px-5 md:py-5">
                  {phase.steps.map((step) => (
                    <label
                      key={step.key}
                      htmlFor={step.key}
                      className="flex cursor-pointer items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <input
                        id={step.key}
                        type="checkbox"
                        checked={!!checked[step.key]}
                        onChange={() => toggle(step.key)}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
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
                            <span className="ml-2 rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground uppercase no-underline">
                              {optionalBadgeLabel(t, step.optional)}
                            </span>
                          )}
                        </p>
                        {step.note && (
                          <p className="mt-1 text-[11px]/relaxed text-foreground/70">
                            {step.note}
                          </p>
                        )}
                        {step.images && step.images.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {step.images.map((src) => (
                              <img
                                key={src}
                                src={src}
                                alt=""
                                className="w-full max-w-40 rounded-md border sm:max-w-sm"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
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
