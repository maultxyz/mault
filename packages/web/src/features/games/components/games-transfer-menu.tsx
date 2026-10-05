import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  createGame,
  gamesQueryOptions,
  updateGame,
} from "@/features/games/api/games";
import {
  buildGamesExport,
  downloadGamesExport,
  parseGamesExport,
  planGamesImport,
  toGameInput,
} from "@/features/games/lib/games-export";
import type {
  GamesImportPlan,
  GamesTransferMenuProps,
} from "@/lib/interfaces/games";
import { toast } from "@/lib/toast";
import {
  IconChevronDown,
  IconDownload,
  IconFileSettings,
  IconLoader2,
  IconUpload,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function GamesTransferMenu({ games }: GamesTransferMenuProps) {
  const { t } = useTranslation("games");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<GamesImportPlan | null>(null);

  const runImport = async (plan: GamesImportPlan) => {
    setIsImporting(true);
    let failed = 0;
    try {
      for (const game of plan.creates) {
        const result = await createGame(toGameInput(game)).catch(() => null);
        if (!result?.success) failed++;
      }
      for (const { guid, game } of plan.updates) {
        const result = await updateGame(guid, toGameInput(game)).catch(
          () => null,
        );
        if (!result?.success) failed++;
      }
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: gamesQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: collectionsQueryOptions.queryKey,
        }),
        queryClient.invalidateQueries({ queryKey: binsQueryOptions.queryKey }),
      ]);
      setIsImporting(false);
    }

    const total = plan.creates.length + plan.updates.length;
    if (failed === total) {
      toast.error(t("gamesTransfer.toasts.importFailed"));
    } else if (failed > 0) {
      toast.warning(
        t("gamesTransfer.toasts.partiallyImported", {
          count: total - failed,
          failed,
        }),
      );
    } else {
      toast.success(t("gamesTransfer.toasts.imported", { count: total }));
    }
  };

  const importText = (text: string) => {
    let plan: GamesImportPlan;
    try {
      plan = planGamesImport(parseGamesExport(text), games);
    } catch {
      toast.error(t("gamesTransfer.toasts.invalid"));
      return;
    }
    if (plan.updates.length > 0) {
      setPendingPlan(plan);
    } else {
      void runImport(plan);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" disabled={isImporting} />}
        >
          {isImporting ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconFileSettings />
          )}
          {isImporting
            ? t("gamesTransfer.importing")
            : t("gamesTransfer.label")}
          <IconChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={games.length === 0}
            onClick={() => downloadGamesExport(buildGamesExport(games), "all")}
          >
            <IconDownload />
            {t("gamesTransfer.exportAll")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <IconUpload />
            {t("gamesTransfer.import")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void file.text().then(importText);
        }}
      />
      <DeleteDialog
        open={!!pendingPlan}
        onOpenChange={(open) => {
          if (!open) setPendingPlan(null);
        }}
        title={t("gamesTransfer.confirmDialog.title")}
        description={t("gamesTransfer.confirmDialog.description", {
          count: pendingPlan?.updates.length ?? 0,
          names:
            pendingPlan?.updates.map(({ game }) => game.name).join(", ") ?? "",
        })}
        confirmLabel={t("gamesTransfer.confirmDialog.confirm", {
          count:
            (pendingPlan?.creates.length ?? 0) +
            (pendingPlan?.updates.length ?? 0),
        })}
        onConfirm={() => {
          if (pendingPlan) void runImport(pendingPlan);
        }}
      >
        {pendingPlan && pendingPlan.creates.length > 0 && (
          <p className="text-sm text-foreground/70">
            {t("gamesTransfer.confirmDialog.creates", {
              count: pendingPlan.creates.length,
              names: pendingPlan.creates.map((g) => g.name).join(", "),
            })}
          </p>
        )}
      </DeleteDialog>
    </>
  );
}
