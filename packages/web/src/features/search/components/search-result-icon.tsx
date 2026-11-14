import { SEARCH_RESULT_ICON_CLASS } from "@/lib/constants/search";
import type { SearchResultIconProps } from "@/lib/interfaces/search";

export function SearchResultIcon({ icon: Icon }: SearchResultIconProps) {
  return (
    <span className={SEARCH_RESULT_ICON_CLASS} aria-hidden="true">
      <Icon />
    </span>
  );
}
