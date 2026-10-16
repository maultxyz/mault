import { useBuildChecklist } from "@/features/build/api/use-build-checklist";
import { useBuildPhases } from "@/features/build/api/use-build-phases";
import { usePartsChecklist } from "@/features/build/api/use-parts-checklist";
import { phaseAnchorId } from "@/features/build/lib/anchors";
import { useBuildSetup } from "@/features/build/api/use-build-setup";
import { visibleBomGroups } from "@/features/build/lib/bom-parts";
import {
  BUILD_ASSEMBLY_ANCHOR,
  BUILD_PARTS_ANCHOR,
  BUILD_SETUP_ANCHOR,
} from "@/lib/constants/build";
import type { BuildTocEntry } from "@/lib/interfaces/build";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function useBuildToc(): BuildTocEntry[] {
  const { t } = useTranslation("build");
  const phases = useBuildPhases();
  const { checked: stepsChecked } = useBuildChecklist();
  const { checked: partsChecked } = usePartsChecklist();
  const { boardType, mountType } = useBuildSetup();

  return useMemo(() => {
    const partRows = visibleBomGroups(boardType, mountType).flatMap(
      (group) => group.rows,
    );
    const phaseEntries: BuildTocEntry[] = phases.map((phase) => ({
      id: phaseAnchorId(phase.key),
      label: phase.title,
      done: phase.steps.filter((step) => stepsChecked[step.key]).length,
      total: phase.steps.length,
      depth: 1,
    }));

    const entries: BuildTocEntry[] = [
      { id: BUILD_SETUP_ANCHOR, label: t("hero.nav.setup"), depth: 0 },
      {
        id: BUILD_PARTS_ANCHOR,
        label: t("hero.nav.parts"),
        done: partRows.filter((row) => partsChecked[row.key]).length,
        total: partRows.length,
        depth: 0,
      },
      {
        id: BUILD_ASSEMBLY_ANCHOR,
        label: t("hero.nav.assembly"),
        done: phaseEntries.reduce((sum, entry) => sum + (entry.done ?? 0), 0),
        total: phaseEntries.reduce((sum, entry) => sum + (entry.total ?? 0), 0),
        depth: 0,
      },
      ...phaseEntries,
    ];

    let number = 0;
    return entries.map((entry) =>
      entry.depth === 0 ? { ...entry, number: ++number } : entry,
    );
  }, [t, phases, stepsChecked, partsChecked, boardType, mountType]);
}
