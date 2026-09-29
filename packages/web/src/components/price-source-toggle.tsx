import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRICE_SOURCE,
  PRICE_SOURCE_FIELDS,
  PRICE_SOURCES,
  type PriceSource,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function PriceSourceToggle() {
  const { t } = useTranslation("settings");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data } = useQuery(queryOpts);
  const current = data?.priceSource ?? DEFAULT_PRICE_SOURCE;

  const mutation = useMutation({
    mutationFn: (priceSource: PriceSource) => saveOrgSettings({ priceSource }),
    onMutate: async (priceSource) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          priceSource,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
    },
    onSuccess: (result) => {
      if (result.success && result.data)
        queryClient.setQueryData(queryOpts.queryKey, result.data);
      void queryClient.invalidateQueries({
        queryKey: collectionCardsKeys.root(),
      });
    },
  });

  return (
    <div className="flex gap-2">
      {PRICE_SOURCES.map((source) => {
        const isSelected = current === source;
        return (
          <button
            key={source}
            type="button"
            onClick={() => mutation.mutate(source)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-3 w-36 transition-all",
              isSelected
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            <span className="text-xs font-medium">
              {t(`pricing.sources.${source}`)}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {PRICE_SOURCE_FIELDS[source].currency}
            </span>
          </button>
        );
      })}
    </div>
  );
}
