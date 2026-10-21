import { MarketingRule } from "@/components/marketing-rule";
import { Checkbox } from "@/components/ui/checkbox";
import { SelfHostCodeBlock } from "@/features/self-host/components/code-block";
import { selfHostStepKey } from "@/features/self-host/lib/sections";
import type { SelfHostSectionProps } from "@/lib/interfaces/self-host";
import { cn } from "@/lib/utils";
import { Trans, useTranslation } from "react-i18next";

export function SelfHostGuideSection({
  section,
  step,
  checked,
  toggle,
}: SelfHostSectionProps) {
  const { t } = useTranslation("selfhost");
  const done = section.steps.filter(
    (s) => checked[selfHostStepKey(section.key, s.key)],
  ).length;

  return (
    <section
      id={section.key}
      className="mx-auto max-w-4xl scroll-mt-14 px-4 py-10"
    >
      <div className="flex flex-col gap-4">
        <MarketingRule
          lead={step}
          label={t(`sections.${section.key}.label`)}
          aside={
            <span className="tabular-nums">
              {done}/{section.steps.length}
            </span>
          }
        />
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {t(`sections.${section.key}.title`)}
          </h2>
          <p className="text-sm/relaxed text-foreground/70">
            {t(`sections.${section.key}.description`)}
          </p>
        </div>
      </div>

      <ol className="mt-6 divide-y overflow-hidden rounded-lg border bg-card">
        {section.steps.map((s, i) => {
          const key = selfHostStepKey(section.key, s.key);
          const isChecked = !!checked[key];
          return (
            <li key={key} className="flex gap-3 p-4">
              <Checkbox
                id={key}
                checked={isChecked}
                onCheckedChange={() => toggle(key)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={key}
                  className="flex cursor-pointer items-baseline gap-2.5"
                >
                  <span className="font-heading text-2xs font-semibold text-primary tabular-nums">
                    {`${step}.${String(i + 1).padStart(2, "0")}`}
                  </span>
                  <span
                    className={cn(
                      "text-sm/relaxed",
                      isChecked &&
                        "text-foreground/70 line-through decoration-foreground/70",
                    )}
                  >
                    <Trans
                      t={t}
                      i18nKey={`sections.${section.key}.steps.${s.key}.text`}
                      components={{
                        code: (
                          <code className="rounded-sm bg-muted px-1 py-0.5 font-heading text-xs text-foreground" />
                        ),
                      }}
                    />
                  </span>
                </label>
                {s.code && <SelfHostCodeBlock code={s.code} />}
                {s.hasNote && (
                  <p className="mt-2 text-xs/relaxed text-foreground/70">
                    <Trans
                      t={t}
                      i18nKey={`sections.${section.key}.steps.${s.key}.note`}
                      components={{
                        code: (
                          <code className="rounded-sm bg-muted px-1 py-0.5 font-heading text-xs text-foreground" />
                        ),
                      }}
                    />
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
