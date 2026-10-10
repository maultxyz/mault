import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function StorageExportMenu({ location }: StorageExportMenuProps) {
  const { t } = useTranslation("storage");
  const [open, setOpen] = useState(false);
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
      })),
      slug,
      { isMtg: singleGameKey === "mtg", fieldDefinitions },
      true,
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconDownload />
        {t("export.button")}
        <IconChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
