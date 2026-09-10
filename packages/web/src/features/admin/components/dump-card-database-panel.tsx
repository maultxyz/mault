import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCardSync } from "@/features/admin/api/use-card-sync";
import { dumpCards, listCardGameKeys } from "@/lib/api/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function DumpCardDatabasePanel() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { isRunning } = useCardSync();
  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpGameKey, setDumpGameKey] = useState<string>("__all__");

  const cardGamesQuery = useQuery({
    queryKey: ["admin", "cards", "games"],
    queryFn: () => listCardGameKeys().then((r) => r.data ?? []),
    staleTime: 30_000,
  });

  const dumpMutation = useMutation({
    mutationFn: (gameKey?: string) => dumpCards(gameKey),
    onSuccess: (result) => {
      setDumpOpen(false);
      toast.success(result.message);
      // Refreshes the card database list too (features/admin/components/
      // card-database-manager.tsx owns that query key).
      queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toasts.dumpError"));
    },
  });

  const selectedDumpGame = cardGamesQuery.data?.find(
    (g) => g.gameKey === dumpGameKey,
  );

  return (
    <>
      <div className="rounded-lg border p-4 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-medium">{t("dumpDatabase.heading")}</p>
          <p className="text-xs text-muted-foreground">
            {t("dumpDatabase.description")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select
            value={dumpGameKey}
            onValueChange={(value) => setDumpGameKey(value ?? "__all__")}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t("dumpDatabase.scopePlaceholder")}>
                {dumpGameKey === "__all__"
                  ? t("dumpDatabase.allGames")
                  : selectedDumpGame &&
                    `${selectedDumpGame.gameKey} (${selectedDumpGame.count})`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">
                {t("dumpDatabase.allGames")}
              </SelectItem>
              {(cardGamesQuery.data ?? []).map((g) => (
                <SelectItem key={g.gameKey} value={g.gameKey}>
                  {g.gameKey} ({g.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            disabled={isRunning}
            onClick={() => setDumpOpen(true)}
          >
            {t("dumpDatabase.dumpButton")}
          </Button>
        </div>
      </div>

      <DeleteDialog
        open={dumpOpen}
        onOpenChange={setDumpOpen}
        title={t("dumpDatabase.dialogTitle")}
        description={
          dumpGameKey === "__all__"
            ? t("dumpDatabase.confirmAll")
            : t("dumpDatabase.confirmScoped", { scope: dumpGameKey })
        }
        confirm={{ type: "keyword" }}
        confirmLabel={t("dumpDatabase.dumpButton")}
        onConfirm={() =>
          dumpMutation.mutate(
            dumpGameKey === "__all__" ? undefined : dumpGameKey,
          )
        }
      />
    </>
  );
}
