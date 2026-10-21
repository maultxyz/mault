import { GuideChecklistItem } from "@/components/guide/guide-checklist-item";
import { GuideCodeBlock } from "@/components/guide/guide-code-block";
import { GuideSectionHeader } from "@/components/guide/guide-section-header";
import { selfHostStepKey } from "@/features/self-host/lib/sections";
import type { SelfHostSectionProps } from "@/lib/interfaces/self-host";
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
      <GuideSectionHeader
        id={section.key}
        step={step}
        eyebrow={t(`sections.${section.key}.label`)}
        heading={t(`sections.${section.key}.title`)}
        aside={
          <span className="tabular-nums">
            {done}/{section.steps.length}
          </span>
        }
      >
        <p className="text-sm/relaxed text-foreground/70">
          {t(`sections.${section.key}.description`)}
        </p>
      </GuideSectionHeader>

      <ol className="mt-6 divide-y overflow-hidden rounded-lg border bg-card">
        {section.steps.map((s, i) => {
          const key = selfHostStepKey(section.key, s.key);
          return (
            <li key={key} className="p-4">
              <GuideChecklistItem
                id={key}
                checked={!!checked[key]}
                onToggle={() => toggle(key)}
                number={`${step}.${String(i + 1).padStart(2, "0")}`}
                details={
                  <>
                    {s.code && <GuideCodeBlock code={s.code} />}
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
                  </>
                }
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
              </GuideChecklistItem>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
