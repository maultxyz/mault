import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { STATS_ALL_COLLECTIONS } from "@/lib/constants/stats";
import type { StatsControlsProps } from "@/lib/interfaces/stats";
import { STATS_RANGES } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function StatsControls({
  collectionGuid,
  onCollectionChange,
  range,
  onRangeChange,
}: StatsControlsProps) {
  const { t } = useTranslation("stats");
  const { activeOrg } = useOrg();
  const { data: collections = [] } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });
  const selected = collections.find((c) => c.guid === collectionGuid);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={collectionGuid ?? STATS_ALL_COLLECTIONS}
        onValueChange={(value) =>
          onCollectionChange(
            !value || value === STATS_ALL_COLLECTIONS ? null : value,
          )
        }
      >
        <SelectTrigger
          className="w-full sm:w-56"
          aria-label={t("controls.collection")}
        >
          <SelectValue>
            {selected?.name ?? t("controls.allCollections")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATS_ALL_COLLECTIONS}>
            {t("controls.allCollections")}
          </SelectItem>
          {collections.map((collection) => (
            <SelectItem key={collection.guid} value={collection.guid}>
              {collection.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ButtonGroup
        className="w-full sm:w-auto"
        aria-label={t("controls.range")}
      >
        {STATS_RANGES.map((option) => (
          <Button
            key={option}
            variant={range === option ? "outline-selected" : "outline"}
            aria-pressed={range === option}
            className="flex-1 sm:flex-none"
            onClick={() => onRangeChange(option)}
          >
            {t(`controls.ranges.${option}`)}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}
