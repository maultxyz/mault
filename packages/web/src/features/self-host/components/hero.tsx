import { MarketingRule } from "@/components/marketing-rule";
import { selfHostStepKey } from "@/features/self-host/lib/sections";
import { SELF_HOST_SETUP_ANCHOR } from "@/lib/constants/self-host";
import type { SelfHostHeroProps } from "@/lib/interfaces/self-host";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function SelfHostHero({ sections, checked }: SelfHostHeroProps) {
  const { t } = useTranslation("selfhost");

  const totals = sections.map((section) => ({
    key: section.key,
    total: section.steps.length,
    done: section.steps.filter(
      (s) => checked[selfHostStepKey(section.key, s.key)],
    ).length,
  }));
  const done = totals.reduce((sum, s) => sum + s.done, 0);
  const total = totals.reduce((sum, s) => sum + s.total, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 pb-2 md:pt-14">
      <MarketingRule lead="Mault" label={t("hero.eyebrow")} />
      <h1 className="mt-6 font-heading text-4xl leading-[0.95] font-semibold tracking-tight text-balance md:text-5xl">
        {t("hero.title")}
      </h1>
      <p className="mt-5 max-w-2xl text-sm/relaxed text-foreground/70 md:text-base/relaxed">
        {t("hero.description")}
      </p>

      <nav
        aria-label={t("toc.label")}
        className="mt-8 max-w-2xl rounded-lg border bg-card p-1.5"
      >
        <div className="mb-1 flex items-center justify-between border-b px-2 pt-1 pb-2 font-heading text-2xs font-medium tracking-widest text-foreground/70 uppercase tabular-nums">
          <span>{t("toc.label")}</span>
          <span>
            {done}/{total} · {pct}%
          </span>
        </div>
        <ol className="flex flex-col">
          <li>
            <a
              href={`#${SELF_HOST_SETUP_ANCHOR}`}
              className="flex items-center gap-2.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted motion-reduce:transition-none"
            >
              <span className="w-6 shrink-0 font-heading text-xs font-semibold text-primary tabular-nums">
                01
              </span>
              <span className="min-w-0 flex-1 truncate">
                {t("setup.label")}
              </span>
            </a>
          </li>
          {totals.map((entry, i) => (
            <li key={entry.key}>
              <a
                href={`#${entry.key}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-muted motion-reduce:transition-none"
              >
                <span className="w-6 shrink-0 font-heading text-xs font-semibold text-primary tabular-nums">
                  {String(i + 2).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {t(`sections.${entry.key}.label`)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-heading text-xs text-foreground/70 tabular-nums">
                    {entry.done}/{entry.total}
                  </span>
                  {entry.done === entry.total ? (
                    <IconCircleCheckFilled className="size-4 text-success" />
                  ) : (
                    <span className="h-1 w-12 overflow-hidden rounded-full bg-border sm:w-16">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${(entry.done / entry.total) * 100}%` }}
                      />
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
