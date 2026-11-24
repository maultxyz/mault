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
  THANKSGIVING_ACORN,
  THANKSGIVING_COLORS,
  THANKSGIVING_LEAF_GRADIENTS,
  THANKSGIVING_LEAVES,
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

function ThanksgivingArt({ withHangingAccent }: SeasonalCornerArtProps) {
  const gradientIdPrefix = useId();
  const acornGradientId = `${gradientIdPrefix}-acorn`;
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
        <radialGradient id={acornGradientId} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor={THANKSGIVING_COLORS.acornNutLight} />
          <stop offset="100%" stopColor={THANKSGIVING_COLORS.acornNutDark} />
        </radialGradient>
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
      {withHangingAccent && (
        <g
          transform={`translate(${THANKSGIVING_ACORN.x} ${THANKSGIVING_ACORN.y}) rotate(${THANKSGIVING_ACORN.rotate})`}
        >
          <ellipse cx={0} cy={2.5} rx={4} ry={5} fill={`url(#${acornGradientId})`} />
          <path
            d="M-5 -0.5C-5 -4.5 5 -4.5 5 -0.5C3 0.8 -3 0.8 -5 -0.5Z"
            fill={THANKSGIVING_COLORS.acornCap}
          />
          <path
            d="M-3.5 -2L-1.5 0M-1 -3L1 -0.5M1.5 -3L3.5 -0.8"
            stroke={THANKSGIVING_COLORS.acornCapTexture}
            strokeWidth={0.4}
            strokeLinecap="round"
          />
          <path
            d="M0 -3.4Q0.4 -5.6 1.8 -6.2"
            fill="none"
            stroke={THANKSGIVING_COLORS.acornCap}
            strokeWidth={0.9}
            strokeLinecap="round"
          />
          <ellipse cx={-1.4} cy={1.6} rx={0.9} ry={1.6} fill={THANKSGIVING_COLORS.acornShine} fillOpacity={0.3} />
        </g>
      )}
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
