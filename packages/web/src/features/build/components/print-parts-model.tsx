import { Skeleton } from "@/components/ui/skeleton";
import { useBuildSetup } from "@/features/build/api/use-build-setup";
import {
  printBreakoutHeight,
  printPartEntries,
} from "@/features/build/lib/print-parts";
import { lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";

const PrintPartsViewer = lazy(
  () => import("@/features/build/components/print-parts-viewer"),
);

export function PrintPartsModel() {
  const { t } = useTranslation("build");
  const { moduleCount, boardType, mountType } = useBuildSetup();
  const breakoutHeight = printBreakoutHeight(moduleCount, boardType, mountType);
  const entries = useMemo(
    () => printPartEntries(moduleCount, breakoutHeight),
    [moduleCount, breakoutHeight],
  );

  return (
    <div className="flex flex-col gap-3 pb-3">
      <p className="text-sm/relaxed text-foreground/70">
        {t("printModel.description", { count: moduleCount })}
      </p>
      <Suspense
        fallback={<Skeleton className="h-80 rounded-lg sm:h-[28rem]" />}
      >
        <PrintPartsViewer
          moduleCount={moduleCount}
          breakoutHeight={breakoutHeight}
          entries={entries}
        />
      </Suspense>
    </div>
  );
}
