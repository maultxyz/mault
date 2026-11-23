import { Skeleton } from "@/components/ui/skeleton";
import type { HomeCardRailSkeletonProps } from "@/lib/interfaces/skeletons";

export function HomeCardRailSkeletonTiles({ tileClassName, tileCount }: HomeCardRailSkeletonProps) {
  return Array.from({ length: tileCount }).map((_, index) => (
    <li key={index} className={tileClassName} aria-hidden="true">
      <span className="flex flex-col gap-1.5">
        <Skeleton className="aspect-[2.5/3.5] w-full rounded-lg" />
        <span className="flex flex-col">
          <span className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-4/5" />
          </span>
          <span className="flex h-4 items-center">
            <Skeleton className="h-3 w-1/2" />
          </span>
        </span>
      </span>
    </li>
  ));
}
