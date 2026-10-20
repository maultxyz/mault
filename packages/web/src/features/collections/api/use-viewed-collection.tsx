import { useCollections } from "@/features/collections/api/use-collections";
import type { Collection } from "@magic-vault/shared";
import { createContext, useContext } from "react";

export const ViewedCollectionContext = createContext<Collection | null>(null);

export function useViewedCollection() {
  const viewed = useContext(ViewedCollectionContext);
  const { activeCollection, isLoading } = useCollections();
  return {
    collection: viewed ?? activeCollection,
    isViewingOther: viewed !== null,
    isLoading,
  };
}
