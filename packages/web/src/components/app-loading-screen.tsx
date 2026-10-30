import { BrandIcon } from "@/components/brand-icon";
import { SeasonalPumpkin, SpiderWeb } from "@/components/halloween-decor";
import {
  LOADING_QUIP_INTERVAL_MS,
  LOADING_QUIP_KEYS,
  LOADING_VIEWFINDER_CORNERS,
} from "@/lib/constants/loading";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

function ScanningCard() {
  return (
    <div aria-hidden className="relative [perspective:900px]">
      {LOADING_VIEWFINDER_CORNERS.map((corner) => (
        <span
          key={corner.className}
          className={cn(
            "absolute size-6 border-primary animate-[loading-viewfinder-lock_3.6s_ease-in-out_infinite] motion-reduce:animate-none",
            corner.className,
          )}
          style={
            {
              "--lock-x": corner.lockOffsetX,
              "--lock-y": corner.lockOffsetY,
            } as CSSProperties
          }
        />
      ))}
      <div className="animate-[loading-hero-float_3.2s_ease-in-out_infinite] motion-reduce:animate-none">
        <div className="transition-transform duration-300 ease-out [transform:rotateX(calc(var(--parallax-y,0)*-14deg))_rotateY(calc(var(--parallax-x,0)*14deg))]">
          <div className="relative grid h-40 w-28 place-items-center overflow-hidden rounded-xl bg-card shadow-popover ring-1 ring-border animate-[loading-card-recognized_3.6s_ease-out_infinite] motion-reduce:animate-none">
            <BrandIcon className="size-12 text-foreground" />
            <SeasonalPumpkin className="absolute top-2 right-2 size-5" />
            <div className="absolute inset-x-0 top-0 h-8 bg-linear-to-b from-transparent to-primary/35 animate-[loading-scan-beam_3.6s_cubic-bezier(0.65,0,0.35,1)_infinite_both] motion-reduce:hidden">
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary shadow-[0_0_12px_2px_var(--color-primary)]" />
            </div>
            <span className="absolute bottom-3 grid size-6 place-items-center rounded-full bg-success-strong text-white shadow-popover animate-[loading-recognized-pop_3.6s_ease-out_infinite_both] motion-reduce:hidden">
              <IconCheck className="size-3.5" />
            </span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-7 left-1/2 h-3 w-24 -translate-x-1/2 rounded-full bg-foreground/15 blur-md animate-[loading-hero-shadow_3.2s_ease-in-out_infinite] motion-reduce:animate-none" />
    </div>
  );
}

function LoadingQuip() {
  const { t } = useTranslation("common");
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_QUIP_KEYS.length),
  );

  useEffect(() => {
    const id = setInterval(
      () => setIndex((current) => (current + 1) % LOADING_QUIP_KEYS.length),
      LOADING_QUIP_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <p
      key={index}
      aria-hidden
      className="absolute top-full left-1/2 mt-12 w-max -translate-x-1/2 text-sm font-medium text-foreground/70 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
    >
      {t(`loadingGate.quips.${LOADING_QUIP_KEYS[index]}`)}
    </p>
  );
}

export function AppLoadingScreen({
  className,
  onTransitionEnd,
}: {
  className?: string;
  onTransitionEnd?: () => void;
}) {
  const { t } = useTranslation("common");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onPointerMove = (event: PointerEvent) => {
      root.style.setProperty(
        "--parallax-x",
        String((event.clientX / window.innerWidth) * 2 - 1),
      );
      root.style.setProperty(
        "--parallax-y",
        String((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "h-dvh w-dvw flex items-center justify-center bg-muted dark:bg-black relative overflow-hidden",
        className,
      )}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) onTransitionEnd?.();
      }}
    >
      <SpiderWeb corner="top-left" withSpider className="size-28" />
      <div className="relative flex flex-col items-center">
        <ScanningCard />
        <LoadingQuip />
        <span className="sr-only">{t("loadingGate.loadingVault")}</span>
      </div>
    </div>
  );
}
