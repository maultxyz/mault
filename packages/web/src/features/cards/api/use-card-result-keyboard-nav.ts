import {
  countGridColumns,
  isGridNavigationKey,
  nextGridIndex,
} from "@/features/cards/lib/grid-navigation";
import type { CardResultKeyboardNavOptions } from "@/lib/interfaces/cards";
import { useCallback, useRef, type KeyboardEvent } from "react";

export function useCardResultKeyboardNav({
  onSelect,
  onCancel,
}: CardResultKeyboardNavOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const getResults = useCallback(
    () =>
      Array.from(gridRef.current?.children ?? []).filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      ),
    [],
  );

  const onInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        const first = getResults()[0];
        if (!first) return;
        event.preventDefault();
        first.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        onSelect(0, { stay: event.shiftKey });
      } else if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    },
    [getResults, onSelect, onCancel],
  );

  const onResultKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      const results = getResults();
      const index = results.indexOf(event.currentTarget);
      if (index === -1) return;
      if (event.key === "Enter") {
        event.preventDefault();
        onSelect(index, { stay: event.shiftKey });
        return;
      }
      if (!isGridNavigationKey(event.key)) return;
      event.preventDefault();
      const next = nextGridIndex(
        index,
        results.length,
        countGridColumns(results),
        event.key,
      );
      if (next === null) inputRef.current?.focus();
      else results[next].focus();
    },
    [getResults, onSelect, onCancel],
  );

  return { inputRef, gridRef, onInputKeyDown, onResultKeyDown };
}
