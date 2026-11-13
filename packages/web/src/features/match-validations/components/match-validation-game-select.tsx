import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { matchValidationProgressQueryOptions } from "@/features/match-validations/api/match-validations";
import { MATCH_VALIDATION_ALL_GAMES } from "@/lib/constants/match-validations";
import type { MatchValidationGameSelectProps } from "@/lib/interfaces/match-validations";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function MatchValidationGameSelect({
  gameKey,
  onGameKeyChange,
  className,
}: MatchValidationGameSelectProps) {
  const { t } = useTranslation("matchValidations");
  const { data: progress } = useQuery(matchValidationProgressQueryOptions);
  const games = progress?.games ?? [];
  const gameLabel = (key: string) =>
    key === MATCH_VALIDATION_ALL_GAMES
      ? t("gameFilter.all")
      : (games.find((game) => game.gameKey === key)?.gameName ?? key);
  const value = gameKey ?? MATCH_VALIDATION_ALL_GAMES;

  return (
    <Select
      value={value}
      onValueChange={(next) =>
        onGameKeyChange(next === MATCH_VALIDATION_ALL_GAMES ? null : (next as string))
      }
    >
      <SelectTrigger className={cn("w-full sm:w-44", className)} aria-label={t("gameFilter.label")}>
        <SelectValue>{gameLabel(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={MATCH_VALIDATION_ALL_GAMES}>{t("gameFilter.all")}</SelectItem>
        {games.map((game) => (
          <SelectItem key={game.gameKey} value={game.gameKey}>
            {game.gameName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
