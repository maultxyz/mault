import { useEffect, useRef } from "react";
import type { Collection } from "@magic-vault/shared";
import { readLastOpenedCollectionGuid } from "@/hooks/use-collection-view-memory";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePrefetchCollectionFirstPage } from "@/hooks/use-prefetch-collection-first-page";

export function useWarmLastOpenedCollection(collections: Collection[] | undefined, isHomeLoaded: boolean): void {
  const orgId = useActiveOrgId();
  const prefetchCollectionFirstPage = usePrefetchCollectionFirstPage();
  const warmedOrgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId || !collections || !isHomeLoaded || warmedOrgIdRef.current === orgId) return;
    warmedOrgIdRef.current = orgId;
    const lastOpenedGuid = readLastOpenedCollectionGuid(orgId);
    if (lastOpenedGuid && collections.some((collection) => collection.guid === lastOpenedGuid)) {
      prefetchCollectionFirstPage(lastOpenedGuid);
    }
  }, [orgId, collections, isHomeLoaded, prefetchCollectionFirstPage]);
}
