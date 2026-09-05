import { cn } from "@/lib/utils";
import { IconPigFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

function ScanningCard() {
  return (
    <div className="relative flex h-36 w-28 items-center justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 rounded-full bg-foreground/6 blur-2xl"
      />
      <div className="absolute inset-x-1 top-1/2 h-9 -translate-y-1/2 rounded-md border border-border bg-foreground/2" />
      <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div className="absolute inset-x-3 top-1/2 h-0.75 -translate-y-1/2 rounded-full bg-foreground/60 animate-[card-scan-flash_2.4s_ease-in-out_infinite]" />
      <div className="absolute flex flex-col gap-0.5 p-1 h-20 w-14 rounded-md border border-foreground/25 bg-card shadow-sm animate-[card-scan-pass_2.4s_ease-in-out_infinite]">
        <div className="w-full bg-foreground/10 h-1/2 rounded-sm top-1.5" />
        <div className="w-full h-1.5 rounded-sm bg-foreground/10" />
        <div className="w-1/3 h-1.5 rounded-sm bg-foreground/10" />
        <div className="w-2/3 h-1.5 rounded-sm bg-foreground/10" />
      </div>
    </div>
  );
}

// The one loading screen for the whole app - AppLoadingGate uses it while
// org/collection data loads, and it's also the Suspense fallback for lazy
// route chunks (see RouteLoadingFallback), so every full-page loading state
// looks the same instead of a plain spinner in some places and this in others.
export function AppLoadingScreen({
  className,
  onTransitionEnd,
}: {
  className?: string;
  onTransitionEnd?: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div
      className={cn(
        "h-dvh w-dvw flex items-center justify-center bg-muted dark:bg-black relative overflow-hidden",
        className,
      )}
      onTransitionEnd={onTransitionEnd}
    >
      <div className="flex flex-col items-center gap-2 relative">
        <span className="mb-1 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-foreground/4 text-foreground">
          <IconPigFilled className="size-4.5" />
        </span>
        <ScanningCard />
        <span className="text-sm text-muted-foreground font-bold">
          {t("loadingGate.loadingVault")}
        </span>
      </div>
    </div>
  );
}
