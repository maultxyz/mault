import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { computeBinCount, DEFAULT_MODULE_COUNT, withScanRuleFields } from "@magic-vault/shared";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { binSetsQueryOptions } from "@/features/devices/api/devices";
import { configsFromSet } from "@/features/scanner/lib/bin-routing";
import { useSorter } from "@/features/sorter/api/use-sorter";
import { useActiveOrgId } from "@/hooks/use-org";
import type { RulesData } from "@/lib/interfaces/rules";

export function useRulesData(): RulesData {
  const orgId = useActiveOrgId();
  const sorter = useSorter();
  const collections = useQuery(collectionsQueryOptions(orgId));
  const binSets = useQuery(binSetsQueryOptions(orgId));
  const collection = collections.data?.find((c) => c.isActive) ?? null;
  const gameGuid = collection?.game?.guid ?? undefined;

  const sets = useMemo(
    () => (binSets.data ?? []).filter((s) => (s.game?.guid ?? undefined) === gameGuid),
    [binSets.data, gameGuid],
  );
  const activeSet = sets.find((s) => s.isActive) ?? sets[0];
  const moduleCount = sorter.device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const bins = useMemo(() => configsFromSet(activeSet, computeBinCount(moduleCount)), [activeSet, moduleCount]);
  const fieldDefinitions = useMemo(
    () => withScanRuleFields(collection?.game?.fieldDefinitions ?? [], collection?.game?.foilTypes ?? []),
    [collection?.game?.fieldDefinitions, collection?.game?.foilTypes],
  );
  const freeformOptions = !!collection?.lang && collection.lang !== "en";

  return {
    collection,
    gameGuid,
    sets,
    activeSet,
    bins,
    fieldDefinitions,
    freeformOptions,
    isPending: collections.isPending || binSets.isPending,
    isError: collections.isError || binSets.isError,
    isRefetching: collections.isRefetching || binSets.isRefetching,
    refetch: () => {
      void collections.refetch();
      void binSets.refetch();
    },
  };
}
