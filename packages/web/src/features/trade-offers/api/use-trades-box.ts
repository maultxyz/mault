import { TRADES_BOX_PARAM, TRADES_BOXES } from "@/lib/constants/trade-offers";
import type { TradesBox } from "@/lib/interfaces/trade-offers";
import { useSearchParams } from "react-router-dom";

export function useTradesBox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedBox = searchParams.get(TRADES_BOX_PARAM);
  const box: TradesBox = (TRADES_BOXES as readonly string[]).includes(requestedBox ?? "")
    ? (requestedBox as TradesBox)
    : "received";
  const changeBox = (next: TradesBox) =>
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous);
        if (next === "received") updated.delete(TRADES_BOX_PARAM);
        else updated.set(TRADES_BOX_PARAM, next);
        return updated;
      },
      { replace: true },
    );
  return { box, changeBox };
}
