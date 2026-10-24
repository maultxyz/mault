import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  allExportAdapters,
  runExport,
  supportsGame,
  type ExportAdapter,
} from "@/features/cards/lib/export";
import { gamesQueryOptions } from "@/features/games/api/games";
import { storageLocationExportQueryOptions } from "@/features/storage/api/storage-locations";
import type { StorageExportMenuProps } from "@/lib/interfaces/storage";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { MOBILE_PILL_BUTTON_SM_CLASS } from "@/lib/constants/nav";
import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageExportMenu({ location }: StorageExportMenuProps) {
  const { t } = useTranslation("storage");
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const [combineDuplicates, setCombineDuplicates] = useState(true);
  const { data: cards } = useQuery(
    storageLocationExportQueryOptions(location.guid, open),
  );
  const { data: games = [] } = useQuery(gamesQueryOptions);

  const gameKeys = useMemo(
    () => [...new Set((cards ?? []).map((entry) => entry.gameKey ?? undefined))],
    [cards],
  );
  const adapters = useMemo(
    () =>
      allExportAdapters.filter((adapter) =>
        gameKeys.every((key) => supportsGame(adapter, key)),
      ),
    [gameKeys],
  );
  const singleGameKey = gameKeys.length === 1 ? gameKeys[0] : undefined;
  const fieldDefinitions = useMemo(
    () => games.find((game) => game.key === singleGameKey)?.fieldDefinitions ?? [],
    [games, singleGameKey],
  );

  const handleExport = (adapter: ExportAdapter) => {
    if (!cards) return;
    const slug = location.name.replace(/\s+/g, "-").toLowerCase();
    runExport(
      adapter,
      cards.map((entry) => ({
        card: entry.card,
        isFoil: entry.isFoil,
        foilType: entry.foilType ?? undefined,
        condition: entry.condition,
      })),
      slug,
      {
        isMtg: singleGameKey === "mtg",
        fieldDefinitions,
        gameKey: singleGameKey,
        gameName: games.find((game) => game.key === singleGameKey)?.name,
      },
      combineDuplicates,
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant={isMobile ? "secondary" : "outline"}
            className={isMobile ? MOBILE_PILL_BUTTON_SM_CLASS : undefined}
          />
        }
      >
        <IconDownload />
        {t("export.button")}
        <IconChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuCheckboxItem
          checked={combineDuplicates}
          onCheckedChange={setCombineDuplicates}
        >
          {t("export.combineDuplicates")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {cards ? (
          adapters.map((adapter) => (
            <DropdownMenuItem
              key={adapter.key}
              onClick={() => handleExport(adapter)}
            >
              {adapter.label}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>{t("export.loading")}</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
