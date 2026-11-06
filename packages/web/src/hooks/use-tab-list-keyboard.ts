import { useCallback } from "react";

export function useTabListKeyboard<T extends string>(
  keys: T[],
  value: T,
  onChange: (value: T) => void,
) {
  const selectedIndex = Math.max(keys.indexOf(value), 0);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (keys.length === 0) return;
      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") {
        nextIndex = (selectedIndex + 1) % keys.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (selectedIndex - 1 + keys.length) % keys.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = keys.length - 1;
      }
      if (nextIndex === null) return;
      event.preventDefault();
      onChange(keys[nextIndex]);
      event.currentTarget
        .closest('[role="tablist"]')
        ?.querySelectorAll<HTMLElement>('[role="tab"]')
        [nextIndex]?.focus();
    },
    [keys, selectedIndex, onChange],
  );

  const tabIndexFor = (index: number) => (index === selectedIndex ? 0 : -1);

  return { onKeyDown, tabIndexFor };
}
