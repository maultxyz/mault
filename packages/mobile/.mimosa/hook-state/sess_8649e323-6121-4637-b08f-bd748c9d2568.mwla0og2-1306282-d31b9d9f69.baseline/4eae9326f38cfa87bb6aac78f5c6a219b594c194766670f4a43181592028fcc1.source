import { useQuery } from "@tanstack/react-query";
import { shareLinksQueryOptions } from "@/features/share-links/api/share-links";
import { useActiveOrgId } from "@/hooks/use-org";

export function useActiveShareLinkCount(subjectGuid: string | null | undefined): number {
  const links = useQuery(shareLinksQueryOptions(useActiveOrgId(), subjectGuid ?? null));
  return links.data?.length ?? 0;
}
