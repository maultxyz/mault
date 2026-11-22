import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUSINESS_STATUS_FILTER_ALL } from "@/lib/constants/business";
import type {
  BusinessListFiltersProps,
  BusinessStatusFilterProps,
} from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function BusinessStatusFilter<T extends string>({
  statuses,
  value,
  onChange,
  labelOf,
}: BusinessStatusFilterProps<T>) {
  const { t } = useTranslation("business");
  return (
    <Select
      value={value ?? BUSINESS_STATUS_FILTER_ALL}
      onValueChange={(next) =>
        onChange(statuses.find((status) => status === next) ?? null)
      }
    >
      <SelectTrigger className="w-32 shrink-0" aria-label={t("filters.status")}>
        <SelectValue>{value ? labelOf(value) : t("filters.allStatuses")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BUSINESS_STATUS_FILTER_ALL}>{t("filters.allStatuses")}</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {labelOf(status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BusinessListFilters({ search, filter }: BusinessListFiltersProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">{search}</div>
      {filter}
    </div>
  );
}
