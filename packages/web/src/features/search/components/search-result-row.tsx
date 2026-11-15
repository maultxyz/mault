import { SEARCH_RESULT_ROW_CLASS } from "@/lib/constants/search";
import type { SearchResultRowProps } from "@/lib/interfaces/search";
import { Link } from "react-router-dom";

export function SearchResultRow({ to, title, subtitle, leading, onNavigate }: SearchResultRowProps) {
  return (
    <li>
      <Link to={to} onClick={onNavigate} className={SEARCH_RESULT_ROW_CLASS}>
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          {subtitle && <span className="block truncate text-xs text-foreground/70">{subtitle}</span>}
        </span>
      </Link>
    </li>
  );
}
