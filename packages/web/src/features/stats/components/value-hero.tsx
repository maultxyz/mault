import { STATS_HERO_SPARKLINE } from "@/lib/constants/stats";
import type { ValueHeroProps } from "@/lib/interfaces/stats";
import { cn } from "@/lib/utils";
import { sparklinePaths } from "@magic-vault/shared";
import { IconArrowDownRight, IconArrowUpRight } from "@tabler/icons-react";
import { useId } from "react";

export function ValueHero({ label, value, stats, sparklineValues, change }: ValueHeroProps) {
  const fillId = useId();
  const { width, height, top, lineHeight } = STATS_HERO_SPARKLINE;
  const paths = sparklinePaths(sparklineValues, width, lineHeight, top);

  return (
    <section
      aria-label={label}
      className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary to-primary-hover p-6 text-primary-foreground md:p-3"
    >
      {paths && (
        <svg
          aria-hidden
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity={0.22} />
              <stop offset="1" stopColor="white" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={paths.area} fill={`url(#${fillId})`} />
          <path
            d={paths.line}
            fill="none"
            stroke="white"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <div className="relative flex flex-col gap-6 md:gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-4xl font-bold tracking-tight md:text-2xl">{value}</p>
          {change && (
            <p className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary-foreground/18 px-2.5 py-1 text-xs font-semibold tabular-nums">
              {change.change.direction === "up" ? (
                <IconArrowUpRight aria-hidden className="size-3.5" />
              ) : change.change.direction === "down" ? (
                <IconArrowDownRight aria-hidden className="size-3.5" />
              ) : null}
              {`${change.change.change} · ${change.change.percent}`}
              <span className="font-normal">{change.caption}</span>
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col-reverse",
                index === 0 ? "pr-3" : "border-l border-primary-foreground/30 px-3",
              )}
            >
              <dt className="text-2xs">{stat.label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
