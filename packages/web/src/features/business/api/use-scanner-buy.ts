import { intakeLotQueryOptions } from "@/features/business/api/business";
import { useOpenBuy } from "@/features/business/api/use-open-buy";
import type {
  ScannerBuyDialog,
  ScannerBuyFinished,
  ScannerBuyState,
} from "@/lib/interfaces/business";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function useScannerBuy(
  collectionGuid: string | undefined,
  watchesDetail: boolean,
): ScannerBuyState {
  const openBuyState = useOpenBuy(collectionGuid);
  const { openBuy } = openBuyState;
  const { data: detail } = useQuery({
    ...intakeLotQueryOptions(openBuy?.guid),
    enabled: !!openBuy && watchesDetail,
  });
  const [finished, setFinished] = useState<ScannerBuyFinished | null>(null);
  const [dialog, setDialog] = useState<ScannerBuyDialog | null>(null);
  const matchingDetail =
    detail && detail.guid === openBuy?.guid && detail.status === "open"
      ? detail
      : null;
  const finishedBuyGuid =
    finished && finished.collectionGuid === collectionGuid && !openBuy
      ? finished.guid
      : null;

  return {
    ...openBuyState,
    collectionGuid,
    lot: matchingDetail ?? openBuy,
    belowMinimumScanIds: matchingDetail?.belowMinimumScanIds ?? [],
    finishedBuyGuid,
    markFinished: (guid) => setFinished({ guid, collectionGuid }),
    dismissFinished: () => setFinished(null),
    dialog,
    setDialog: (nextDialog) => {
      if (nextDialog?.kind === "start") setFinished(null);
      setDialog(nextDialog);
    },
  };
}
