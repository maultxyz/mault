import { CommandLoading } from "@/components/ui/command";
import { GlobalSearchSkeletonRow } from "@/features/search/components/global-search-skeleton-row";
import type { GlobalSearchLoadingRowProps } from "@/lib/interfaces/search";

export function GlobalSearchLoadingRow({ label }: GlobalSearchLoadingRowProps) {
  return (
    <CommandLoading label={label}>
      <div aria-hidden="true">
        <GlobalSearchSkeletonRow />
      </div>
    </CommandLoading>
  );
}
