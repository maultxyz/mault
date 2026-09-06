import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { BinCard } from "@/features/bins/components/bin-card";
import { useOrg } from "@/features/companies/api/use-organization";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function BinList() {
  const { t } = useTranslation("bins");
  const { configs, selectedBin, setSelectedBin, hasCatchAll } = useBinConfigs();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({ ...binsQueryOptions, enabled: !!activeOrg });

  if (isLoading) {
    return (
      <ScrollArea>
        <div className="flex flex-col rounded-lg overflow-hidden border">
          {Array.from({ length: configs.length || 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-13 rounded-none border-b last:border-b-0"
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto">
      <div className="flex flex-col gap-2">
        {configs.map((config) => (
          <BinCard
            key={config.binNumber}
            config={config}
            active={config.binNumber === selectedBin}
            onClick={() => setSelectedBin(config.binNumber)}
          />
        ))}
      </div>
      {!hasCatchAll && (
        <p className="text-xs text-destructive">{t("binList.needCatchAll")}</p>
      )}
    </div>
  );
}
