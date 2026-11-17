import { Badge } from "@/components/ui/badge";
import { GLOBAL_SEARCH_GAME_BADGE_CLASS, GLOBAL_SEARCH_SELECTED_GAME_BADGE_CLASS } from "@/lib/constants/search";
import type { GlobalSearchGameBadgesProps } from "@/lib/interfaces/search";
import { cn } from "@/lib/utils";
import type { KeyboardEvent } from "react";

function keepEnterOnBadge(event: KeyboardEvent<HTMLElement>) {
  if (event.key === "Enter") event.stopPropagation();
}

export function GlobalSearchGameBadges({ label, allGamesLabel, games, selectedGameKey, onSelect }: GlobalSearchGameBadgesProps) {
  const options = [{ gameKey: null, gameName: allGamesLabel }, ...games];
  return (
    <div role="group" aria-label={label} className="flex gap-1.5 overflow-x-auto px-1.5 pt-1.5 pb-0.5">
      {options.map(({ gameKey, gameName }) => {
        const isSelected = gameKey === selectedGameKey;
        return (
          <Badge
            key={gameKey ?? "all"}
            variant="outline"
            render={<button type="button" />}
            aria-pressed={isSelected}
            onClick={() => onSelect(gameKey)}
            onKeyDown={keepEnterOnBadge}
            className={cn(GLOBAL_SEARCH_GAME_BADGE_CLASS, isSelected && GLOBAL_SEARCH_SELECTED_GAME_BADGE_CLASS)}
          >
            {gameName}
          </Badge>
        );
      })}
    </div>
  );
}
