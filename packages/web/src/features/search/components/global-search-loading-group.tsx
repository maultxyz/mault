import { CommandLoading } from "@/components/ui/command";
import { GlobalSearchSkeletonRow } from "@/features/search/components/global-search-skeleton-row";
import { SEARCH_RESULT_SKELETON_ROWS } from "@/lib/constants/search";
import type { GlobalSearchLoadingGroupProps } from "@/lib/interfaces/search";

export function GlobalSearchLoadingGroup({ heading }: GlobalSearchLoadingGroupProps) {
  return (
    <CommandLoading label={heading}>
      <div aria-hidden="true" className="flex flex-col p-1">
        <span className="px-2.5 py-1.5 text-xs font-medium text-foreground/70">{heading}</span>
        {Array.from({ length: SEARCH_RESULT_SKELETON_ROWS }).map((_, index) => (
          <GlobalSearchSkeletonRow key={index} />
        ))}
      </div>
    </CommandLoading>
  );
}
