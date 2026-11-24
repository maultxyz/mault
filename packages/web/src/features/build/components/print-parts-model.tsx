import { Skeleton } from "@/components/ui/skeleton";
import { useBuildSetup } from "@/features/build/api/use-build-setup";
import {
  isBreakoutBoardBuild,
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
  const isBreakoutBoard = isBreakoutBoardBuild(boardType, mountType);
  const entries = useMemo(
    () => printPartEntries(moduleCount, breakoutHeight, isBreakoutBoard),
    [moduleCount, breakoutHeight, isBreakoutBoard],
  );

  return (
    <div className="flex flex-col gap-3 pb-3">
      <p className="text-sm/relaxed text-foreground/70">
        {t("printModel.description", { count: moduleCount })}
      </p>
      <Suspense
        fallback={
          <div role="status" aria-busy="true" className="flex flex-col gap-3">
            <span className="sr-only">{t("a11y.loading", { ns: "common" })}</span>
            <Skeleton className="h-80 rounded-lg sm:h-[28rem]" />
            <Skeleton className="my-0.75 h-3.5 w-2/3" />
            <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
              {entries.map(({ part }) => (
                <div key={part} className="flex h-8 items-center gap-2.5 px-2">
                  <Skeleton className="h-3.5 w-5 shrink-0" />
                  <Skeleton className="size-4 shrink-0 rounded-sm" />
                  <Skeleton className="h-3.5 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        }
      >
        <PrintPartsViewer
          moduleCount={moduleCount}
          breakoutHeight={breakoutHeight}
          isBreakoutBoard={isBreakoutBoard}
          entries={entries}
        />
      </Suspense>
    </div>
  );
}
