import { HOME_PATH } from "@/lib/constants/nav";
import { SEARCH_QUERY_PARAM } from "@/lib/constants/search";
import { openGlobalSearch } from "@/lib/global-search-store";
import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

export default function GlobalSearchRedirect() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get(SEARCH_QUERY_PARAM) ?? "";

  useEffect(() => {
    openGlobalSearch(initialQuery);
  }, [initialQuery]);

  return <Navigate to={HOME_PATH} replace />;
}
