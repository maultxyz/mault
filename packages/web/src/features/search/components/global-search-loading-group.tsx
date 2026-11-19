import { CommandLoading } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { SEARCH_RESULT_SKELETON_ROWS } from "@/lib/constants/search";
import type { GlobalSearchLoadingGroupProps } from "@/lib/interfaces/search";

export function GlobalSearchLoadingGroup({ heading }: GlobalSearchLoadingGroupProps) {
  return (
    <CommandLoading label={heading}>
      <div aria-hidden="true" className="flex flex-col p-1">
        <span className="px-2.5 py-1.5 text-xs font-medium text-foreground/70">{heading}</span>
        {Array.from({ length: SEARCH_RESULT_SKELETON_ROWS }).map((_, index) => (
          <div key={index} className="flex min-h-11 items-center gap-2.5 px-2.5 py-1.5 md:min-h-9">
            <Skeleton className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm md:w-7" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </CommandLoading>
  );
}
