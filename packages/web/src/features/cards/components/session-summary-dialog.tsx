import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { SessionWrappedToggle } from "@/components/session-wrapped-toggle";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { applyCardFilters } from "@/features/cards/api/use-card-filter-sort";
import {
  allExportAdapters,
  runExport,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import {
  buildWrappedSlides,
  type WrappedSlide,
} from "@/features/cards/lib/wrapped-slides";
import type { CardFilters } from "@/lib/interfaces/cards";
import { useCollections } from "@/features/collections/api/use-collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  formatElapsed,
  formatUsd,
} from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import { cn } from "@/lib/utils";
import type { ScannedCard } from "@magic-vault/shared";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useQuery } from "@tanstack/react-query";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCoin,
  IconCrown,
  IconDownload,
  IconFlame,
  IconLayoutGrid,
  IconPalette,
  IconSparkles,
  IconStack2,
  IconStars,
  IconTrophy,
  IconX,
} from "@tabler/icons-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { useTranslation } from "react-i18next";

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  collectionName: string;
  onMarkDownloaded: (scanIds: string[]) => void;
  gridFilters: CardFilters;
  gridFilterCount: number;
}

// A story slide is any wrapped slide except the final "outro" one - that
// one is rendered separately as a themed stats recap, not a story beat.
type StorySlide = Exclude<WrappedSlide, { type: "outro" }>;

const SLIDE_DURATION_MS = 5000;

// Each slide gets a hand-placed "mesh" of soft color blobs (a stack of
// radial-gradients) over a deep base tone, instead of a flat linear
// gradient - the layered/organic look modern "wrapped"-style recaps use.
const BLOB_POSITIONS = ["15% 15%", "85% 10%", "10% 95%", "90% 85%"];

function meshBackground(colors: string[]): string {
  return colors
    .map(
      (color, i) =>
        `radial-gradient(at ${BLOB_POSITIONS[i % BLOB_POSITIONS.length]}, ${color}, transparent 60%)`,
    )
    .join(", ");
}

const SLIDE_MESH: Record<StorySlide["type"], { base: string; colors: string[] }> = {
  intro: {
    base: "#2e1065",
    colors: ["#f0abfc", "#a855f7", "#4f46e5", "#e879f9"],
  },
  total: {
    base: "#172554",
    colors: ["#38bdf8", "#2563eb", "#4338ca", "#22d3ee"],
  },
  unique: {
    base: "#022c22",
    colors: ["#34d399", "#0d9488", "#0e7490", "#4ade80"],
  },
  set: {
    base: "#431407",
    colors: ["#fbbf24", "#ea580c", "#dc2626", "#fb923c"],
  },
  rarity: {
    base: "#4a0519",
    colors: ["#fb7185", "#db2777", "#a21caf", "#f9a8d4"],
  },
  color: {
    base: "#2e1065",
    colors: ["#c4b5fd", "#9333ea", "#a21caf", "#818cf8"],
  },
  mvp: {
    base: "#451a03",
    colors: ["#fde047", "#f59e0b", "#ea580c", "#fbbf24"],
  },
  value: {
    base: "#022c22",
    colors: ["#86efac", "#059669", "#0f766e", "#a3e635"],
  },
  speed: {
    base: "#450a0a",
    colors: ["#fca5a5", "#e11d48", "#ea580c", "#fbbf24"],
  },
};

const GRAIN_OVERLAY =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function MeshBackground({ base, colors }: { base: string; colors: string[] }) {
  // Random each mount (a fresh mount per slide, via `key`) so the spin
  // never feels mechanically identical slide to slide, dialog to dialog.
  const { durationS, direction } = useMemo(
    () => ({
      durationS: 16 + Math.random() * 18, // ~16-34s per rotation - slow
      direction: Math.random() < 0.5 ? "normal" : "reverse",
    }),
    [],
  );

  return (
    <div
      className="absolute -z-10 inset-0 overflow-hidden"
      style={{ backgroundColor: base }}
    >
      <div
        className="absolute -inset-1/2 animate-[wrapped-mesh-spin_1s_linear_infinite]"
        style={{
          backgroundImage: meshBackground(colors),
          animationDuration: `${durationS}s`,
          animationDirection: direction,
        }}
      />
    </div>
  );
}

function useCountUp(target: number, active: boolean, durationMs = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);
  return value;
}

function ProportionBar({
  pct,
  active,
  color,
}: {
  pct: number;
  active: boolean;
  color?: string;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!active) {
      setWidth(0);
      return;
    }
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [active, pct]);
  return (
    <div className="h-2 rounded-full bg-white/20 overflow-hidden">
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color ?? "white" }}
      />
    </div>
  );
}

function SlideIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex size-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
      {children}
    </div>
  );
}

function SlideBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center animate-[wrapped-pop-in_0.5s_ease-out]">
      {children}
    </div>
  );
}

function countUpTarget(slide: StorySlide): number {
  switch (slide.type) {
    case "total":
      return slide.count;
    case "unique":
      return slide.uniqueCount;
    case "value":
      return slide.totalValue;
    case "speed":
      return slide.cardsPerHour ?? 0;
    default:
      return 0;
  }
}

function WrappedSlideContent({
  slide,
  active,
  collectionName,
}: {
  slide: StorySlide;
  active: boolean;
  collectionName: string;
}) {
  const { t } = useTranslation("cards");
  const iconClass = "size-7 text-white";
  // Hoisted above the switch: hooks can't be called conditionally, so this
  // single call covers every slide type that needs a count-up number.
  const countUpValue = useCountUp(countUpTarget(slide), active);

  switch (slide.type) {
    case "intro":
      return (
        <SlideBody>
          <SlideIcon>
            <IconSparkles className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.intro.eyebrow")}
          </p>
          <h2 className="text-4xl font-heading font-bold text-balance">
            {t("sessionWrapped.intro.title", { collectionName })}
          </h2>
          <p className="text-white/70">{t("sessionWrapped.intro.subtitle")}</p>
        </SlideBody>
      );

    case "total": {
      const value = Math.round(countUpValue);
      return (
        <SlideBody>
          <SlideIcon>
            <IconStack2 className={iconClass} />
          </SlideIcon>
          <p className="text-7xl font-heading font-bold tabular-nums">
            {value}
          </p>
          <p className="text-lg font-medium">{t("sessionWrapped.total.title")}</p>
        </SlideBody>
      );
    }

    case "unique": {
      const value = Math.round(countUpValue);
      const percent =
        slide.totalCount > 0
          ? Math.round((slide.uniqueCount / slide.totalCount) * 100)
          : 0;
      return (
        <SlideBody>
          <SlideIcon>
            <IconLayoutGrid className={iconClass} />
          </SlideIcon>
          <p className="text-7xl font-heading font-bold tabular-nums">
            {value}
          </p>
          <p className="text-lg font-medium">
            {t("sessionWrapped.unique.title")}
          </p>
          <p className="text-white/70">
            {t("sessionWrapped.unique.subtitle", { percent })}
          </p>
        </SlideBody>
      );
    }

    case "set":
      return (
        <SlideBody>
          <SlideIcon>
            <IconTrophy className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.set.eyebrow")}
          </p>
          <h2 className="text-4xl font-heading font-bold text-balance">
            {slide.name}
          </h2>
          <p className="text-white/70">
            {t("sessionWrapped.set.subtitle", { count: slide.count })}
          </p>
        </SlideBody>
      );

    case "rarity":
      return (
        <SlideBody>
          <SlideIcon>
            <IconStars className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.rarity.eyebrow")}
          </p>
          <div className="flex w-full max-w-xs flex-col gap-2.5 pt-2">
            {slide.rarities.map((r) => (
              <div key={r.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-white/70 tabular-nums">{r.count}</span>
                </div>
                <ProportionBar
                  pct={slide.total > 0 ? (r.count / slide.total) * 100 : 0}
                  active={active}
                  color={`var(--${r.key})`}
                />
              </div>
            ))}
          </div>
        </SlideBody>
      );

    case "color":
      return (
        <SlideBody>
          <SlideIcon>
            <IconPalette className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.color.eyebrow")}
          </p>
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-full border-2 border-white/40 shadow-lg"
              style={{ backgroundColor: slide.bg }}
            />
            <h2 className="text-4xl font-heading font-bold">{slide.label}</h2>
          </div>
          <p className="text-white/70">
            {t("sessionWrapped.color.subtitle", {
              count: slide.count,
              total: slide.total,
            })}
          </p>
        </SlideBody>
      );

    case "mvp":
      return (
        <SlideBody>
          <SlideIcon>
            <IconCrown className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.mvp.eyebrow")}
          </p>
          <h2 className="text-3xl font-heading font-bold text-balance px-4">
            {slide.name}
          </h2>
          <p className="text-2xl font-semibold tabular-nums">
            {formatUsd(slide.price)}
          </p>
        </SlideBody>
      );

    case "value": {
      const value = countUpValue;
      return (
        <SlideBody>
          <SlideIcon>
            <IconCoin className={iconClass} />
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.value.eyebrow")}
          </p>
          <p className="text-6xl font-heading font-bold tabular-nums">
            {formatUsd(value)}
          </p>
          <p className="text-white/70">
            {t("sessionWrapped.value.avgLabel")} {formatUsd(slide.avgValue)}
          </p>
        </SlideBody>
      );
    }

    case "speed": {
      const rate = slide.cardsPerHour ?? 0;
      const pace =
        slide.cardsPerHour == null
          ? null
          : rate >= 150
            ? "fast"
            : rate >= 50
              ? "medium"
              : "slow";
      return (
        <SlideBody>
          <SlideIcon>
            {pace === "fast" ? (
              <IconFlame className={iconClass} />
            ) : (
              <IconClock className={iconClass} />
            )}
          </SlideIcon>
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">
            {t("sessionWrapped.speed.eyebrow")}
          </p>
          {slide.cardsPerHour != null && (
            <p className="text-6xl font-heading font-bold tabular-nums">
              {Math.round(countUpValue)}
            </p>
          )}
          {slide.cardsPerHour != null && (
            <p className="text-lg font-medium">
              {t("sessionWrapped.speed.unit")}
            </p>
          )}
          {pace && (
            <p className="text-white/70">
              {t(`sessionWrapped.speed.${pace}`)} ·{" "}
              {formatElapsed(slide.elapsedMs)}
            </p>
          )}
        </SlideBody>
      );
    }
  }
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("p-2.5", className)}>
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function SessionSummaryDialog({
  open,
  onOpenChange,
  cards,
  elapsedMs,
  collectionName,
  onMarkDownloaded,
  gridFilters,
  gridFilterCount,
}: SessionSummaryDialogProps) {
  const { t } = useTranslation("cards");
  const [includeDownloaded, setIncludeDownloaded] = useState(false);
  const [applyGridFilters, setApplyGridFilters] = useState(false);
  const [combineDuplicates, setCombineDuplicates] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const { activeCollection } = useCollections();

  const previouslyDownloadedCount = useMemo(
    () => cards.filter((c) => c.isDownloaded).length,
    [cards],
  );
  const exportCards = useMemo(() => {
    const byDownloaded = includeDownloaded
      ? cards
      : cards.filter((c) => !c.isDownloaded);
    // showDownloaded is already handled above by its own dedicated toggle,
    // so it's forced true here to avoid the grid filter re-excluding cards
    // this dialog just chose to include.
    return applyGridFilters
      ? applyCardFilters(byDownloaded, { ...gridFilters, showDownloaded: true })
      : byDownloaded;
  }, [cards, includeDownloaded, applyGridFilters, gridFilters]);
  const stats = useMemo(() => computeStats(cards), [cards]);
  const slug = collectionName.replace(/\s+/g, "-").toLowerCase();
  const { fieldDefinitions } = useBinConfigs();
  const { activeOrg } = useOrg();
  const { data: orgSettings } = useQuery(orgSettingsQueryOptions(activeOrg?.id));
  const wrappedEnabled = orgSettings?.sessionWrappedEnabled ?? true;

  const gameKey = activeCollection?.game?.key;
  const isMtg = gameKey === "mtg";
  const exportContext = { isMtg, fieldDefinitions };
  const exportAdapters: ExportAdapter[] = allExportAdapters.filter((adapter) =>
    supportsGame(adapter, gameKey),
  );

  const slides = useMemo(
    () => buildWrappedSlides(stats, elapsedMs, wrappedEnabled),
    [stats, elapsedMs, wrappedEnabled],
  );

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const clampedIndex = Math.min(index, slides.length - 1);
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === slides.length - 1;

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const skipAll = useCallback(() => {
    setIndex(slides.length - 1);
  }, [slides.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext]);

  function handleDownload(adapter: ExportAdapter) {
    runExport(adapter, exportCards, slug, exportContext, combineDuplicates);
    onMarkDownloaded(exportCards.map((c) => c.scanId));
    onOpenChange(false);
  }

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(e: TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  const slide = slides[clampedIndex];
  const isOutro = slide.type === "outro";
  const autoAdvance = !isLast;

  const cardsPerHour =
    elapsedMs > 0 ? Math.round((cards.length / elapsedMs) * 3_600_000) : null;

  const summaryCells: { label: string; value: string }[] = [
    { label: t("sessionSummaryDialog.totalCards"), value: String(cards.length) },
    { label: t("sessionSummaryDialog.unique"), value: stats ? String(stats.uniqueCount) : "-" },
  ];
  if (stats?.hasPricing) {
    summaryCells.push(
      { label: t("sessionSummaryDialog.totalValue"), value: formatUsd(stats.totalValue) },
      { label: t("sessionSummaryDialog.avgValue"), value: formatUsd(stats.avgValue) },
    );
  }
  summaryCells.push(
    { label: t("sessionSummaryDialog.duration"), value: formatElapsed(elapsedMs) },
    {
      label: t("sessionSummaryDialog.cardsPerHour"),
      value: cardsPerHour != null ? String(cardsPerHour) : "-",
    },
  );
  // summaryCells is always 4 (no pricing) or 6 (with pricing) items - pick
  // whichever column count fills every row completely.
  const summaryCellCols = summaryCells.length % 3 === 0 ? 3 : 2;

  const statsRecap = (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border bg-input/20 dark:bg-input/30 divide-y divide-border">
        <div
          className={cn(
            "grid",
            summaryCellCols === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {summaryCells.map((cell, i) => (
            <StatCell
              key={cell.label}
              label={cell.label}
              value={cell.value}
              // divide-x/divide-y add borders by sibling order, not actual
              // grid position, so they misplace borders around wrapped
              // rows - position math avoids that.
              className={cn(
                i % summaryCellCols !== 0 && "border-l",
                i >= summaryCellCols && "border-t",
              )}
            />
          ))}
        </div>
        {stats?.mostValuable && (
          <div className="px-2.5 py-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              {t("sessionSummaryDialog.mostValuable")}
            </p>
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs font-semibold truncate">
                {stats.mostValuable.name}
              </p>
              <p className="text-xs text-muted-foreground shrink-0">
                {formatUsd(stats.mostValuable.price)}
              </p>
            </div>
          </div>
        )}
      </div>
      {stats && (
        <div
          className={
            stats.rarities.length > 0
              ? "grid grid-cols-2 gap-3"
              : "grid grid-cols-1 gap-3"
          }
        >
          {stats.rarities.length > 0 && (
            <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {t("sessionSummaryDialog.byRarity")}
              </p>
              <div className="flex flex-col gap-1">
                {stats.rarities.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: `var(--${r.key})` }}
                      />
                      <span>{r.label}</span>
                    </div>
                    <span className="text-muted-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
              {t("sessionSummaryDialog.topSets")}
            </p>
            <div className="flex flex-col gap-1">
              {stats.sets.slice(0, 5).map((s) => (
                <div
                  key={s.code}
                  className="flex items-center justify-between text-xs gap-1"
                >
                  <span
                    className="truncate text-muted-foreground"
                    title={s.name}
                  >
                    {s.name}
                  </span>
                  <span className="shrink-0">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {previouslyDownloadedCount > 0 && (
        <label className="flex items-center justify-between gap-1.5 text-sm text-muted-foreground">
          {t("sessionSummaryDialog.includePreviouslyDownloaded")}
          <Switch
            size="sm"
            checked={includeDownloaded}
            onCheckedChange={setIncludeDownloaded}
          />
        </label>
      )}
      {gridFilterCount > 0 && (
        <label className="flex items-center justify-between gap-1.5 text-sm text-muted-foreground">
          {t("sessionSummaryDialog.applyGridFilters", { count: gridFilterCount })}
          <Switch
            size="sm"
            checked={applyGridFilters}
            onCheckedChange={setApplyGridFilters}
          />
        </label>
      )}
      <label className="flex items-center justify-between gap-1.5 text-sm text-muted-foreground">
        {t("sessionSummaryDialog.combineDuplicates")}
        <Switch
          size="sm"
          checked={combineDuplicates}
          onCheckedChange={setCombineDuplicates}
        />
      </label>
      {wrappedEnabled && (
        <label className="flex items-center justify-between gap-1.5 text-sm text-muted-foreground">
          {t("sessionSummaryDialog.sessionWrappedToggle")}
          <SessionWrappedToggle size="sm" />
        </label>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button disabled={exportCards.length === 0} className="w-full" />}
        >
          <IconDownload className="size-4" />
          {t("sessionSummaryDialog.download", { count: exportCards.length })}
          <IconChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          {exportAdapters.map((adapter) => (
            <DropdownMenuItem
              key={adapter.key}
              onClick={() => handleDownload(adapter)}
            >
              {adapter.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 ring-foreground/10 outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            isOutro
              ? "bg-popover text-popover-foreground"
              : "text-white",
          )}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          onPointerLeave={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {!isOutro && (
            <>
              <MeshBackground key={slide.key} {...SLIDE_MESH[slide.type]} />
              <div
                className="pointer-events-none absolute -z-10 inset-0 opacity-[0.15] mix-blend-overlay"
                style={{ backgroundImage: GRAIN_OVERLAY }}
              />
            </>
          )}
          <DialogTitle className="sr-only">
            {isOutro
              ? t("sessionSummaryDialog.title")
              : t("sessionWrapped.srTitle", { collectionName })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("sessionWrapped.srDescription")}
          </DialogDescription>

          {!isOutro && (
            <div className="flex gap-1 px-4 pt-3 shrink-0">
              {slides.map((s, i) => (
                <div
                  key={s.key}
                  className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden"
                >
                  {i < clampedIndex && <div className="h-full w-full bg-white" />}
                  {i === clampedIndex && autoAdvance && (
                    <div
                      className="h-full w-full bg-white origin-left animate-[wrapped-progress_5s_linear_forwards]"
                      style={{
                        animationPlayState: paused ? "paused" : "running",
                        animationDuration: `${SLIDE_DURATION_MS}ms`,
                      }}
                      onAnimationEnd={goNext}
                    />
                  )}
                  {i === clampedIndex && !autoAdvance && (
                    <div className="h-full w-full bg-white" />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-4 pt-3 shrink-0">
            <span
              className={cn(
                "text-xs font-medium truncate",
                isOutro ? "text-muted-foreground" : "text-white/70",
              )}
            >
              {isOutro ? t("sessionSummaryDialog.title") : collectionName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {!isOutro && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipAll}
                  className="h-7 px-2 text-xs text-white/80 hover:bg-white/15 hover:text-white"
                >
                  {t("sessionWrapped.skipAll")}
                </Button>
              )}
              <DialogPrimitive.Close
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className={
                      isOutro ? undefined : "text-white hover:bg-white/15 hover:text-white"
                    }
                  />
                }
              >
                <IconX className="size-4" />
                <span className="sr-only">{t("sessionSummaryDialog.close")}</span>
              </DialogPrimitive.Close>
            </div>
          </div>

          <div
            className={cn(
              "relative flex-1 min-h-0 overflow-y-auto",
              isOutro ? "px-4 py-3" : "flex items-center justify-center px-6 py-8",
            )}
          >
            {isOutro ? (
              statsRecap
            ) : (
              <WrappedSlideContent
                key={slide.key}
                slide={slide}
                active={true}
                collectionName={collectionName}
              />
            )}
          </div>

          {!isFirst && !isOutro && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <IconChevronLeft className="size-5" />
              <span className="sr-only">{t("sessionWrapped.previous")}</span>
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <IconChevronRight className="size-5" />
              <span className="sr-only">{t("sessionWrapped.next")}</span>
            </button>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
