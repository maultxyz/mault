import { usePublicCardHolds } from "@/features/card-holds/api/use-public-card-holds";
import { CardHoldDialog } from "@/features/card-holds/components/card-hold-dialog";
import { holdForScans } from "@/features/card-holds/lib/hold-for-scans";
import { CardHoldsContext } from "@/lib/card-holds-context";
import type {
  CardHoldTarget,
  CardHoldsContextValue,
  CardHoldsProviderProps,
} from "@/lib/interfaces/card-holds";
import { useMemo, useState } from "react";

export function CardHoldsProvider({
  kind,
  token,
  holdMinutes,
  children,
}: CardHoldsProviderProps) {
  const holdsAllowed = holdMinutes !== null;
  const { holds, placeHold, releaseHold } = usePublicCardHolds(kind, token, holdsAllowed);
  const [target, setTarget] = useState<CardHoldTarget | null>(null);
  const holdsByScanId = useMemo(
    () => new Map(holds.map((hold) => [hold.scanId, hold])),
    [holds],
  );
  const value = useMemo<CardHoldsContextValue>(
    () => ({
      holdFor: (scanIds) => holdForScans(holdsByScanId, scanIds),
      openHoldDialog: setTarget,
    }),
    [holdsByScanId],
  );

  if (!holdsAllowed) return children;

  return (
    <CardHoldsContext value={value}>
      {children}
      <CardHoldDialog
        target={target}
        holdsByScanId={holdsByScanId}
        placeHold={placeHold}
        releaseHold={releaseHold}
        onClose={() => setTarget(null)}
      />
    </CardHoldsContext>
  );
}
