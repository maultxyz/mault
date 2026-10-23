import {
  UNMATCHED_CARD_PARAM,
  UNMATCHED_VIEW_PARAM,
} from "@/lib/constants/scanner";
import type { UnmatchedViewState } from "@/lib/interfaces/scanner";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

function withIndex(params: URLSearchParams, index: number | null) {
  if (index == null) params.delete(UNMATCHED_CARD_PARAM);
  else params.set(UNMATCHED_CARD_PARAM, String(index + 1));
  return params;
}

export function useUnmatchedView(): UnmatchedViewState {
  const [params, setParams] = useSearchParams();
  const open = useCallback(
    (index: number | null = null) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(UNMATCHED_VIEW_PARAM, "1");
        return withIndex(next, index);
      }),
    [setParams],
  );
  const setOpenIndex = useCallback(
    (index: number | null) =>
      setParams((prev) => withIndex(new URLSearchParams(prev), index), {
        replace: true,
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = withIndex(new URLSearchParams(prev), null);
        next.delete(UNMATCHED_VIEW_PARAM);
        return next;
      }),
    [setParams],
  );
  const position = Number.parseInt(params.get(UNMATCHED_CARD_PARAM) ?? "", 10);
  return {
    isOpen: params.get(UNMATCHED_VIEW_PARAM) === "1",
    openIndex: Number.isFinite(position) && position > 0 ? position - 1 : null,
    open,
    setOpenIndex,
    close,
  };
}
