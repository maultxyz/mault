import { ViewfinderCorners } from "@/features/landing/components/viewfinder-corners";
import type { FeatureSpotlightStageProps } from "@/lib/interfaces/landing";
import { useTranslation } from "react-i18next";

export function FeatureSpotlightStage({
  numberLabel,
  isInteractive,
  children,
}: FeatureSpotlightStageProps) {
  const { t } = useTranslation("landing");

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="flex items-center gap-2 font-heading text-2xs font-medium tracking-widest uppercase">
          {isInteractive ? (
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span className="size-2 rounded-full bg-foreground/30" />
          )}
          {t(isInteractive ? "features.stageTryIt" : "features.stageExample")}
        </p>
        <p className="font-heading text-2xs tracking-wide text-foreground/70 tabular-nums">
          {numberLabel}
        </p>
      </div>
      <div className="relative flex min-h-80 items-center justify-center bg-card p-6">
        <ViewfinderCorners className="inset-2" />
        <div className="relative w-full">{children}</div>
      </div>
    </div>
  );
}
