import { Skeleton } from "@/components/ui/skeleton";
import { SEARCH_RESULT_LIST_CLASS, SEARCH_RESULT_SKELETON_ROWS } from "@/lib/constants/search";
import type { SearchResultSectionProps } from "@/lib/interfaces/search";
import { useId } from "react";

export function SearchResultSection({ title, isLoading = false, children }: SearchResultSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} aria-busy={isLoading} className="flex flex-col gap-2 md:gap-1.5">
      <h2 id={headingId} className="font-heading text-base font-semibold text-foreground md:text-sm">
        {title}
      </h2>
      {isLoading ? (
        <div className={SEARCH_RESULT_LIST_CLASS} aria-hidden="true">
          {Array.from({ length: SEARCH_RESULT_SKELETON_ROWS }).map((_, index) => (
            <div key={index} className="flex min-h-12 items-center gap-3 py-2 md:min-h-10 md:gap-2.5 md:py-1.5">
              <Skeleton className="aspect-[2.5/3.5] w-8 shrink-0 rounded-sm md:w-7" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className={SEARCH_RESULT_LIST_CLASS}>{children}</ul>
      )}
    </section>
  );
}
