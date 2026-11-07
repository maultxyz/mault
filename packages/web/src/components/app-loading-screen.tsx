import { BrandIcon } from "@/components/brand-icon";
import { SpiderWeb } from "@/components/halloween-decor";
import {
  LOADING_LOGO_CYCLE_MS,
  LOADING_QUIP_INTERVAL_MS,
  LOADING_QUIP_KEYS,
} from "@/lib/constants/loading";
import { cn } from "@/lib/utils";
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

function HoppingLogo() {
  const [phaseOffsetStyle] = useState(
    () =>
      ({
        "--loading-logo-offset": `-${Math.round(performance.now() % LOADING_LOGO_CYCLE_MS)}ms`,
      }) as CSSProperties,
  );

  return (
    <div aria-hidden className="relative" style={phaseOffsetStyle}>
      <BrandIcon className="loading-logo size-12 overflow-visible text-foreground" />
      <div className="absolute -bottom-1 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-foreground/15 blur-[3px] animate-[loading-logo-shadow_1.8s_ease-in-out_infinite] [animation-delay:var(--loading-logo-offset)] motion-reduce:animate-none" />
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
      className="absolute top-full left-1/2 mt-6 w-max -translate-x-1/2 text-sm font-medium text-foreground/70 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
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

  return (
    <div
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
        <HoppingLogo />
        <LoadingQuip />
        <span role="status" className="sr-only">
          {t("loadingGate.loadingVault")}
        </span>
      </div>
    </div>
  );
}
