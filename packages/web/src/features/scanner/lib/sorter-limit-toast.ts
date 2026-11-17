import { SORTER_LIMIT_MESSAGE_KEYS } from "@/lib/constants/scanner";
import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import type { AppToast } from "@/lib/interfaces/toast";
import type { SorterLimitReason } from "@/lib/interfaces/stations";

export function showSorterLimitToast(
  toast: AppToast,
  t: TFunction<"scanner">,
  sorterLimitReason: SorterLimitReason,
) {
  const key = SORTER_LIMIT_MESSAGE_KEYS[sorterLimitReason];
  toast.error(t(`${key}.title`, { max: MAX_CONNECTED_SORTERS }), {
    description: t(`${key}.description`),
  });
}
