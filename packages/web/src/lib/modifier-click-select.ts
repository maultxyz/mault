import type { MouseEvent } from "react";

function isSelectModifierClick(event: MouseEvent): boolean {
  return event.button === 0 && (event.ctrlKey || event.metaKey);
}

export function modifierClickSelectHandlers(
  onToggleSelect: ((shiftKey: boolean) => void) | undefined,
) {
  if (!onToggleSelect) return {};
  const toggleFromModifierClick = (event: MouseEvent) => {
    if (!isSelectModifierClick(event)) return;
    event.preventDefault();
    event.stopPropagation();
    onToggleSelect(event.shiftKey);
  };
  return {
    onClickCapture: toggleFromModifierClick,
    onContextMenu: toggleFromModifierClick,
  };
}
