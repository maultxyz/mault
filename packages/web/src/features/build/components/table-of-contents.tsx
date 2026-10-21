import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBuildToc } from "@/features/build/api/use-build-toc";
import type { BuildTocListProps } from "@/lib/interfaces/build";
import { cn } from "@/lib/utils";
import { IconCircleCheckFilled, IconListDetails } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function BuildTocList({ entries, onNavigate }: BuildTocListProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) => {
        const hasProgress = entry.total !== undefined && entry.total > 0;
        const complete = hasProgress && entry.done === entry.total;
        const pct = hasProgress
          ? Math.round(((entry.done ?? 0) / (entry.total ?? 1)) * 100)
          : 0;

        return (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted motion-reduce:transition-none",
                entry.depth === 0
                  ? "font-medium"
                  : "pl-10 text-foreground/70 hover:text-foreground",
              )}
            >
              {entry.number !== undefined && (
                <span className="w-6 shrink-0 font-heading text-xs font-semibold text-primary tabular-nums">
                  {String(entry.number).padStart(2, "0")}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              {hasProgress && (
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-heading text-xs text-foreground/70 tabular-nums">
                    {entry.done}/{entry.total}
                  </span>
                  {complete ? (
                    <IconCircleCheckFilled className="size-4 text-success" />
                  ) : (
                    <span className="h-1.5 w-12 overflow-hidden rounded-full bg-secondary sm:w-16">
                      <span
                        className="block h-full rounded-full bg-primary dark:bg-foreground/80"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  )}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function BuildTableOfContents() {
  const { t } = useTranslation("build");
  const entries = useBuildToc();
  const inlineRef = useRef<HTMLElement>(null);
  const [inlineVisible, setInlineVisible] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = inlineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInlineVisible(entry.isIntersecting);
      if (entry.isIntersecting) setOpen(false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav
        ref={inlineRef}
        aria-label={t("toc.label")}
        className="mt-8 max-w-2xl rounded-lg border bg-card p-1.5 dark:border-foreground/15"
      >
        <p className="mb-1 border-b px-2 pt-1 pb-2 font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase">
          {t("toc.label")}
        </p>
        <BuildTocList entries={entries} />
      </nav>
      {!inlineVisible && (
        <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button size="lg" className="h-10 px-4 text-sm shadow-lg">
                  <IconListDetails />
                  {t("toc.label")}
                </Button>
              }
            />
            <PopoverContent
              side="top"
              align="end"
              sideOffset={8}
              className="max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-1.5 text-sm"
            >
              <BuildTocList
                entries={entries}
                onNavigate={() => setOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </>
  );
}
