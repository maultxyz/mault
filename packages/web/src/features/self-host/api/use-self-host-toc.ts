import { selfHostStepKey } from "@/features/self-host/lib/sections";
import { SELF_HOST_SETUP_ANCHOR } from "@/lib/constants/self-host";
import type { GuideTocEntry } from "@/lib/interfaces/guide";
import type { SelfHostSection } from "@/lib/interfaces/self-host";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useSelfHostToc(
  sections: SelfHostSection[],
  checked: Record<string, boolean>,
): GuideTocEntry[] {
  const { t } = useTranslation("selfhost");

  return useMemo<GuideTocEntry[]>(
    () => [
      {
        id: SELF_HOST_SETUP_ANCHOR,
        label: t("setup.label"),
        depth: 0,
        number: 1,
      },
      ...sections.map((section, i) => ({
        id: section.key,
        label: t(`sections.${section.key}.label`),
        done: section.steps.filter(
          (s) => checked[selfHostStepKey(section.key, s.key)],
        ).length,
        total: section.steps.length,
        depth: 0,
        number: i + 2,
      })),
    ],
    [t, sections, checked],
  );
}
