import {
  CHRISTMAS_BOW,
  CHRISTMAS_COLORS,
  CHRISTMAS_ORNAMENTS,
  CHRISTMAS_SNOWFLAKES,
  HALLOWEEN_BAT_PATH,
  HALLOWEEN_COLORS,
  HALLOWEEN_SPIDER,
  HALLOWEEN_SPIDER_LEG_PATHS,
  MAPLE_LEAF_PATH,
  MAPLE_LEAF_VEIN_PATH,
  SEASONAL_CORNER_CLASS,
  SEASONAL_SWAY_ANIMATION_CLASS,
  SPIDER_WEB_DEW_DROPS,
  THANKSGIVING_COLORS,
  THANKSGIVING_LEAF_GRADIENTS,
  THANKSGIVING_LEAVES,
  THANKSGIVING_TURKEY,
  TURKEY_FEATHER_ANGLES,
  TURKEY_FEATHER_BAND_SCALES,
  TURKEY_FEATHER_PALETTES,
  TURKEY_FEATHER_PATH,
} from "@/lib/constants/seasonal";
import type {
  SeasonalAccentProps,
  SeasonalCornerArtProps,
  SeasonalCornerDecorProps,
} from "@/lib/interfaces/seasonal";
import {
  GARLAND_BRANCH_PATH,
  GARLAND_NEEDLE_PATHS,
  SNOWFLAKE_UNIT_PATH,
  SPIDER_WEB_PATH,
  garlandPointAt,
} from "@/lib/seasonal";
import { useIsTopmostSeasonalDecor, useSeasonalTheme } from "@/hooks/use-seasonal-decor";
import { cn } from "@/lib/utils";
import { IconChristmasTree, IconLeaf, IconPumpkinScary } from "@tabler/icons-react";
import { useId } from "react";
import { createPortal } from "react-dom";

function HalloweenArt({ withHangingAccent }: SeasonalCornerArtProps) {
  const gradientId = useId();
  const { threadTopX, threadTopY, x, y } = HALLOWEEN_SPIDER;
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible">
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={HALLOWEEN_COLORS.spiderBodyLight} />
          <stop offset="100%" stopColor={HALLOWEEN_COLORS.spiderBodyDark} />
        </radialGradient>
      </defs>
      <path
        d={SPIDER_WEB_PATH}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.4}
        strokeWidth={1}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {SPIDER_WEB_DEW_DROPS.map((drop) => (
        <circle
          key={`${drop.x}-${drop.y}`}
          cx={drop.x}
          cy={drop.y}
          r={drop.radius}
          fill={HALLOWEEN_COLORS.dew}
          fillOpacity={0.85}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={0.4}
        />
      ))}
      {withHangingAccent && (
        <>
          <g
            className={SEASONAL_SWAY_ANIMATION_CLASS}
            style={{ transformOrigin: `${threadTopX}px ${threadTopY}px` }}
          >
            <line
              x1={threadTopX}
              y1={threadTopY}
              x2={x}
              y2={y - 6}
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeWidth={0.6}
            />
            <g transform={`translate(${x} ${y})`}>
              {HALLOWEEN_SPIDER_LEG_PATHS.map((legPath) => (
                <g key={legPath}>
                  <path
                    d={legPath}
                    fill="none"
                    stroke={HALLOWEEN_COLORS.spiderLegs}
                    strokeWidth={1.1}
                    strokeLinecap="round"
                  />
                  <path
                    d={legPath}
                    transform="scale(-1 1)"
                    fill="none"
                    stroke={HALLOWEEN_COLORS.spiderLegs}
                    strokeWidth={1.1}
                    strokeLinecap="round"
                  />
                </g>
              ))}
              <ellipse cx={0} cy={3} rx={4.2} ry={5} fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.4} />
              <circle cx={0} cy={-3.2} r={2.6} fill={`url(#${gradientId})`} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.4} />
              <circle cx={-1} cy={-3.4} r={1.4} fill={HALLOWEEN_COLORS.spiderEyes} fillOpacity={0.35} />
              <circle cx={1} cy={-3.4} r={1.4} fill={HALLOWEEN_COLORS.spiderEyes} fillOpacity={0.35} />
              <circle cx={-1} cy={-3.4} r={0.6} fill={HALLOWEEN_COLORS.spiderEyes} />
              <circle cx={1} cy={-3.4} r={0.6} fill={HALLOWEEN_COLORS.spiderEyes} />
            </g>
          </g>
          <path
            d={HALLOWEEN_BAT_PATH}
            transform="translate(14 72) rotate(-12) scale(0.85)"
            fill={HALLOWEEN_COLORS.bat}
            stroke="currentColor"
            strokeOpacity={0.45}
            strokeWidth={0.5}
          />
        </>
      )}
    </svg>
  );
}

function TurkeyArt() {
  const gradientIdPrefix = useId();
  const bodyGradientId = `${gradientIdPrefix}-turkey-body`;
  const { x, y, scale, fanMs, headBobMs } = THANKSGIVING_TURKEY;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <radialGradient id={bodyGradientId} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor={THANKSGIVING_COLORS.bodyLight} />
          <stop offset="100%" stopColor={THANKSGIVING_COLORS.bodyDark} />
        </radialGradient>
      </defs>
      <g
        className={SEASONAL_SWAY_ANIMATION_CLASS}
        style={{ transformOrigin: "0px 0px", animationDuration: `${fanMs}ms` }}
      >
        {TURKEY_FEATHER_ANGLES.map((angle, featherIndex) => {
          const palette = TURKEY_FEATHER_PALETTES[featherIndex % TURKEY_FEATHER_PALETTES.length];
          return (
            <g key={angle} transform={`rotate(${angle})`}>
              {TURKEY_FEATHER_BAND_SCALES.map((bandScale, bandIndex) => (
                <path
                  key={bandScale}
                  d={TURKEY_FEATHER_PATH}
                  transform={`scale(${bandScale})`}
                  fill={palette[bandIndex]}
                  stroke={bandIndex === 0 ? "currentColor" : "none"}
                  strokeOpacity={0.25}
                  strokeWidth={0.4}
                />
              ))}
            </g>
          );
        })}
      </g>
      <path
        d="M-2 9L-2.5 15M-2.5 15L-4.5 16.5M-2.5 15L-1 16.8M3 9L3.5 15M3.5 15L1.8 16.8M3.5 15L5.5 16.5"
        fill="none"
        stroke={THANKSGIVING_COLORS.legs}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <ellipse
        cx={0}
        cy={2}
        rx={8.5}
        ry={9.5}
        fill={`url(#${bodyGradientId})`}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={0.4}
      />
      <path d="M-6 0C-4 -3 2 -2 4 3C2 8 -4 9 -6.5 5C-7.2 3.5 -7 1.5 -6 0Z" fill={THANKSGIVING_COLORS.wing} />
      <path
        d="M-5 2.5Q-1 1.5 2.5 4M-5.2 5Q-2 4.5 1 6.5"
        fill="none"
        stroke={THANKSGIVING_COLORS.wingStripe}
        strokeOpacity={0.7}
        strokeWidth={0.5}
        strokeLinecap="round"
      />
      <g
        className={SEASONAL_SWAY_ANIMATION_CLASS}
        style={{ transformOrigin: "3px -4px", animationDuration: `${headBobMs}ms` }}
      >
        <path d="M2.5 -5.5Q4 -9 6.5 -11" stroke={THANKSGIVING_COLORS.head} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        <circle
          cx={7.2}
          cy={-11.5}
          r={3.6}
          fill={THANKSGIVING_COLORS.head}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={0.4}
        />
        <path d="M10.4 -12.6L13.4 -11.4L10.4 -10.4Z" fill={THANKSGIVING_COLORS.beak} />
        <path d="M10.2 -10.6Q11.8 -7 10 -5.2Q8.6 -7.4 9.4 -10.2Z" fill={THANKSGIVING_COLORS.wattle} />
        <circle cx={8.3} cy={-12.6} r={1.1} fill={THANKSGIVING_COLORS.eye} />
        <circle cx={8.6} cy={-12.6} r={0.55} fill={THANKSGIVING_COLORS.pupil} />
      </g>
    </g>
  );
}

function ThanksgivingArt({ withHangingAccent }: SeasonalCornerArtProps) {
  const gradientIdPrefix = useId();
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible">
      <defs>
        {THANKSGIVING_LEAF_GRADIENTS.map((gradient, index) => (
          <linearGradient
            key={`${gradient.from}-${gradient.to}`}
            id={`${gradientIdPrefix}-leaf-${index}`}
            x1="0"
            y1="0"
            x2="0.4"
            y2="1"
          >
            <stop offset="0%" stopColor={gradient.from} />
            <stop offset="100%" stopColor={gradient.to} />
          </linearGradient>
        ))}
      </defs>
      {THANKSGIVING_LEAVES.map((leaf) => (
        <g
          key={`${leaf.x}-${leaf.y}`}
          className={SEASONAL_SWAY_ANIMATION_CLASS}
          style={{ transformOrigin: `${leaf.x}px ${leaf.y}px`, animationDuration: `${leaf.swayMs}ms` }}
        >
          <g transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.scale})`}>
            <path
              d="M0 5.5V11.5"
              stroke={THANKSGIVING_COLORS.stem}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d={MAPLE_LEAF_PATH}
              fill={`url(#${gradientIdPrefix}-leaf-${leaf.gradient})`}
              stroke={THANKSGIVING_COLORS.vein}
              strokeOpacity={0.35}
              strokeWidth={0.4}
              strokeLinejoin="round"
            />
            <path
              d={MAPLE_LEAF_VEIN_PATH}
              fill="none"
              stroke={THANKSGIVING_COLORS.vein}
              strokeOpacity={0.45}
              strokeWidth={0.45}
              strokeLinecap="round"
            />
          </g>
        </g>
      ))}
      {withHangingAccent && <TurkeyArt />}
    </svg>
  );
}

function ChristmasArt({ withHangingAccent }: SeasonalCornerArtProps) {
  const gradientIdPrefix = useId();
  const bowPoint = garlandPointAt(CHRISTMAS_BOW.curveT);
  const ornaments = withHangingAccent ? CHRISTMAS_ORNAMENTS : CHRISTMAS_ORNAMENTS.slice(0, 1);
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible">
      <defs>
        {CHRISTMAS_ORNAMENTS.map((ornament, index) => (
          <radialGradient
            key={ornament.color}
            id={`${gradientIdPrefix}-ornament-${index}`}
            cx="35%"
            cy="30%"
            r="75%"
          >
            <stop offset="0%" stopColor={CHRISTMAS_COLORS.ornamentHighlight} stopOpacity={0.9} />
            <stop offset="25%" stopColor={ornament.color} />
            <stop offset="100%" stopColor={CHRISTMAS_COLORS.ornamentShadow} stopOpacity={0.9} />
          </radialGradient>
        ))}
      </defs>
      {CHRISTMAS_SNOWFLAKES.map((snowflake) => (
        <path
          key={`${snowflake.x}-${snowflake.y}`}
          d={SNOWFLAKE_UNIT_PATH}
          transform={`translate(${snowflake.x} ${snowflake.y}) rotate(${snowflake.rotate}) scale(${snowflake.radius})`}
          fill="none"
          stroke={CHRISTMAS_COLORS.snowflake}
          strokeWidth={1.1}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {ornaments.map((ornament, index) => {
        const hook = garlandPointAt(ornament.curveT);
        const ornamentY = hook.y + ornament.stringLength + ornament.radius;
        const shineX = hook.x - ornament.radius * 0.35;
        const shineY = ornamentY - ornament.radius * 0.4;
        return (
          <g
            key={ornament.color}
            className={SEASONAL_SWAY_ANIMATION_CLASS}
            style={{ transformOrigin: `${hook.x}px ${hook.y}px`, animationDuration: `${ornament.swayMs}ms` }}
          >
            <line
              x1={hook.x}
              y1={hook.y}
              x2={hook.x}
              y2={ornamentY - ornament.radius}
              stroke={CHRISTMAS_COLORS.string}
              strokeWidth={0.6}
            />
            <rect
              x={hook.x - 1.6}
              y={ornamentY - ornament.radius - 1.6}
              width={3.2}
              height={2.2}
              rx={0.5}
              fill={CHRISTMAS_COLORS.ornamentCap}
            />
            <circle
              cx={hook.x}
              cy={ornamentY}
              r={ornament.radius}
              fill={`url(#${gradientIdPrefix}-ornament-${index})`}
            />
            <ellipse
              cx={shineX}
              cy={shineY}
              rx={ornament.radius * 0.28}
              ry={ornament.radius * 0.16}
              transform={`rotate(-35 ${shineX} ${shineY})`}
              fill={CHRISTMAS_COLORS.ornamentHighlight}
              fillOpacity={0.75}
            />
          </g>
        );
      })}
      <path
        d={GARLAND_BRANCH_PATH}
        fill="none"
        stroke={CHRISTMAS_COLORS.branch}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path
        d={GARLAND_NEEDLE_PATHS.dark}
        stroke={CHRISTMAS_COLORS.needlesDark}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path
        d={GARLAND_NEEDLE_PATHS.light}
        stroke={CHRISTMAS_COLORS.needlesLight}
        strokeWidth={1}
        strokeLinecap="round"
      />
      <g transform={`translate(${bowPoint.x} ${bowPoint.y})`}>
        <path d="M0 0L-3 9L-1 8.4L0 10L0.6 1Z" fill={CHRISTMAS_COLORS.bowShade} />
        <path d="M0 0L3.4 8.6L1.4 8.2L0.6 9.8L-0.4 1Z" fill={CHRISTMAS_COLORS.bow} />
        <path d="M0 0C-3 -5 -8 -3 -6.5 0.5C-5.5 2.5 -2 1.4 0 0Z" fill={CHRISTMAS_COLORS.bow} />
        <path d="M0 0C3 -5 8 -3 6.5 0.5C5.5 2.5 2 1.4 0 0Z" fill={CHRISTMAS_COLORS.bow} />
        <circle cx={0} cy={0} r={1.5} fill={CHRISTMAS_COLORS.bowShade} />
      </g>
    </svg>
  );
}

export function SeasonalCornerDecor({
  corner,
  className,
  withHangingAccent,
}: SeasonalCornerDecorProps) {
  const theme = useSeasonalTheme();
  const isTopmostDecor = useIsTopmostSeasonalDecor();
  if (!theme || !isTopmostDecor) return null;
  return createPortal(
    <div
      aria-hidden
      className={cn(
        "pointer-events-none select-none fixed z-decor size-20 text-foreground",
        SEASONAL_CORNER_CLASS[corner],
        className,
      )}
    >
      {theme === "halloween" && <HalloweenArt withHangingAccent={withHangingAccent} />}
      {theme === "thanksgiving" && <ThanksgivingArt withHangingAccent={withHangingAccent} />}
      {theme === "christmas" && <ChristmasArt withHangingAccent={withHangingAccent} />}
    </div>,
    document.body,
  );
}

export function SeasonalAccent({ className }: SeasonalAccentProps) {
  const theme = useSeasonalTheme();
  if (!theme) return null;
  const accentClassName = cn("pointer-events-none shrink-0", className);
  if (theme === "halloween") {
    return <IconPumpkinScary aria-hidden className={cn(accentClassName, "text-warning")} />;
  }
  if (theme === "thanksgiving") {
    return <IconLeaf aria-hidden className={cn(accentClassName, "text-warning")} />;
  }
  return (
    <IconChristmasTree aria-hidden className={cn(accentClassName, "text-success-foreground")} />
  );
}
