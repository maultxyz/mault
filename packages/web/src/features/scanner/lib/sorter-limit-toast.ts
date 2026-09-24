import { MAX_CONNECTED_SORTERS } from "@magic-vault/shared";
import type { TFunction } from "i18next";
import { toast } from "sonner";

export function showSorterLimitToast(
  t: TFunction<"scanner">,
  isHardCap: boolean,
) {
  const key = isHardCap ? "stations.hardCapReached" : "stations.limitReached";
  toast.error(t(`${key}.title`, { max: MAX_CONNECTED_SORTERS }), {
    description: t(`${key}.description`),
  });
}
