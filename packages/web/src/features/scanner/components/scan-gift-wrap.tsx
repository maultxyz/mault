import { markScanGiftUnwrapped } from "@/features/scanner/lib/scan-gift-reveal-store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  SCAN_GIFT_REVEAL_COLORS,
  SCAN_GIFT_REVEAL_SPARKLES,
  SCAN_GIFT_WRAP_ANIMATIONS,
  SCAN_GIFT_WRAP_PAPER_BACKGROUND,
  SCAN_GIFT_WRAP_VARIANT_CLASSES,
} from "@/lib/constants/scan-gift-reveal";
import type {
  ScanGiftWrapPaperProps,
  ScanGiftWrapPhase,
  ScanGiftWrapProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import {
  formatPriceInCurrency,
  SCAN_GIFT_REVEAL_HIGHLIGHT_MS,
  SCAN_GIFT_REVEAL_UNWRAP_MS,
  SCAN_GIFT_REVEAL_WIGGLE_MS,
} from "@magic-vault/shared";
import { IconSparkles } from "@tabler/icons-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";

function GiftWrapPaper({ variant, phase }: ScanGiftWrapPaperProps) {
  const sizes = SCAN_GIFT_WRAP_VARIANT_CLASSES[variant];
  const isUnwrapping = phase === "unwrapping";
  const ribbonStyle = { backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbon };
  const bowLoopStyle = { borderColor: SCAN_GIFT_REVEAL_COLORS.ribbon };
  return (
    <div
      className="absolute inset-0"
      style={{ animation: isUnwrapping ? undefined : SCAN_GIFT_WRAP_ANIMATIONS.wiggle }}
    >
      <div
        className="absolute inset-y-0 left-0 w-1/2 origin-bottom-left overflow-hidden shadow-popover"
        style={{
          background: SCAN_GIFT_WRAP_PAPER_BACKGROUND,
          animation: isUnwrapping ? SCAN_GIFT_WRAP_ANIMATIONS.paperLeft : undefined,
        }}
      >
        <div className={cn("absolute inset-x-0 top-1/2 -translate-y-1/2", sizes.horizontalRibbon)} style={ribbonStyle} />
        <div className={cn("absolute inset-y-0 right-0", sizes.verticalRibbon)} style={ribbonStyle} />
      </div>
      <div
        className="absolute inset-y-0 right-0 w-1/2 origin-bottom-right overflow-hidden shadow-popover"
        style={{
          background: SCAN_GIFT_WRAP_PAPER_BACKGROUND,
          animation: isUnwrapping ? SCAN_GIFT_WRAP_ANIMATIONS.paperRight : undefined,
        }}
      >
        <div className={cn("absolute inset-x-0 top-1/2 -translate-y-1/2", sizes.horizontalRibbon)} style={ribbonStyle} />
        <div
          className={cn("absolute inset-y-0 left-0", sizes.verticalRibbon)}
          style={{ backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbonShade }}
        />
      </div>
      <div
        className={cn("absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2", sizes.bow)}
        style={{ animation: isUnwrapping ? SCAN_GIFT_WRAP_ANIMATIONS.bowPop : undefined }}
      >
        <div
          className={cn("absolute left-0 top-0 h-full w-1/2 rotate-[-25deg] rounded-full", sizes.bowLoopBorder)}
          style={bowLoopStyle}
        />
        <div
          className={cn("absolute right-0 top-0 h-full w-1/2 rotate-[25deg] rounded-full", sizes.bowLoopBorder)}
          style={bowLoopStyle}
        />
        <div
          className="absolute left-1/2 top-1/2 size-1/4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm"
          style={{ backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbonShade }}
        />
      </div>
    </div>
  );
}

function GiftSparkleBurst() {
  return (
    <div className="absolute inset-0">
      {SCAN_GIFT_REVEAL_SPARKLES.map((sparkle) => (
        <IconSparkles
          key={`${sparkle.x}-${sparkle.y}`}
          className="absolute left-1/2 top-1/2 -ml-2.5 -mt-2.5 size-5"
          style={
            {
              color: SCAN_GIFT_REVEAL_COLORS.ribbon,
              "--sparkle-x": `${sparkle.x}px`,
              "--sparkle-y": `${sparkle.y}px`,
              animation: `gift-sparkle 900ms ease-out ${sparkle.delayMs}ms both`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function ScanGiftWrap({ reveal, variant }: ScanGiftWrapProps) {
  const { t } = useTranslation("scanner");
  const prefersReducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<ScanGiftWrapPhase>(
    prefersReducedMotion ? "highlight" : "wrapped",
  );
  const sizes = SCAN_GIFT_WRAP_VARIANT_CLASSES[variant];

  useEffect(() => {
    const phaseDurationMs =
      phase === "wrapped"
        ? SCAN_GIFT_REVEAL_WIGGLE_MS
        : phase === "unwrapping"
          ? SCAN_GIFT_REVEAL_UNWRAP_MS
          : SCAN_GIFT_REVEAL_HIGHLIGHT_MS;
    const timer = setTimeout(() => {
      if (phase === "wrapped") setPhase("unwrapping");
      else if (phase === "unwrapping") setPhase("highlight");
      else markScanGiftUnwrapped(reveal.scanId);
    }, phaseDurationMs);
    return () => clearTimeout(timer);
  }, [phase, reveal.scanId]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[25]">
      {phase === "highlight" ? (
        <>
          <div
            className="absolute inset-0 rounded-[inherit]"
            style={{
              boxShadow: `inset 0 0 0 2px ${SCAN_GIFT_REVEAL_COLORS.ribbon}, inset 0 0 ${sizes.glowInset} ${SCAN_GIFT_REVEAL_COLORS.ribbon}`,
              animation: prefersReducedMotion ? undefined : SCAN_GIFT_WRAP_ANIMATIONS.glow,
            }}
          />
          {variant === "tile" && (
            <>
              {!prefersReducedMotion && <GiftSparkleBurst />}
              <div className="absolute inset-x-0 top-1/3 flex justify-center px-1">
                <div
                  className="flex flex-col items-center rounded-lg px-2.5 py-1 text-center text-black shadow-popover"
                  style={{
                    backgroundColor: SCAN_GIFT_REVEAL_COLORS.ribbon,
                    animation: prefersReducedMotion ? undefined : SCAN_GIFT_WRAP_ANIMATIONS.tag,
                  }}
                >
                  <span className="text-2xs font-semibold uppercase">
                    {t("scanGiftReveal.heading")}
                  </span>
                  <span className="text-sm font-bold">
                    {formatPriceInCurrency(reveal.price, reveal.currency)}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <GiftWrapPaper variant={variant} phase={phase} />
      )}
    </div>
  );
}
