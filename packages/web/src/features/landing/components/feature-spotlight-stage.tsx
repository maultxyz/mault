import type { FeatureSpotlightStageProps } from "@/lib/interfaces/landing";
import { useTranslation } from "react-i18next";

export function FeatureSpotlightStage({
  isInteractive,
  children,
}: FeatureSpotlightStageProps) {
  const { t } = useTranslation("landing");

  return (
    <div className="landing-frame overflow-hidden rounded-lg bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground/70">
          {isInteractive ? (
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span aria-hidden className="size-2 rounded-full bg-foreground/30" />
          )}
          {t(isInteractive ? "features.stageTryIt" : "features.stageExample")}
        </p>
      </div>
      <div className="relative flex min-h-80 items-center justify-center p-6">
        <div className="relative w-full">{children}</div>
      </div>
    </div>
  );
}
