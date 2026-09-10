import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listSyncSources, syncCardById } from "@/lib/api/admin";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function SyncCardByIdPanel() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [syncCardGameKey, setSyncCardGameKey] = useState<string | null>(null);
  const [syncCardLang, setSyncCardLang] = useState<string>("en");
  const [syncCardIdInput, setSyncCardIdInput] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["admin", "sync-sources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  const syncCardMutation = useMutation({
    mutationFn: () =>
      syncCardById(syncCardGameKey!, syncCardIdInput.trim(), syncCardLang),
    onSuccess: (result) => {
      toast.success(result.message);
      setSyncCardIdInput("");
      // Refreshes the card database list/counts (features/admin/components/
      // card-database-manager.tsx + dump-card-database-panel.tsx) - they own
      // the same query key, so this just needs to invalidate it.
      queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
    onError: () => {
      toast.error(t("toasts.syncCardError", { id: syncCardIdInput.trim() }));
    },
  });

  const selectedCardSource = sourcesQuery.data?.find(
    (s) => s.gameKey === syncCardGameKey,
  );

  return (
    <div className="rounded-lg border p-4 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-medium">{t("syncCardById.heading")}</p>
        <p className="text-xs text-muted-foreground">
          {t("syncCardById.description")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Select
          value={syncCardGameKey}
          onValueChange={(value) => {
            setSyncCardGameKey(value);
            const source = sourcesQuery.data?.find(
              (s) => s.gameKey === value,
            );
            setSyncCardLang(source?.languages[0] ?? "en");
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("cardImageVectors.selectGamePlaceholder")}>
              {selectedCardSource?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(sourcesQuery.data ?? []).map((source) => (
              <SelectItem key={source.gameKey} value={source.gameKey}>
                {source.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(selectedCardSource?.languages.length ?? 0) > 1 && (
          <Select
            value={syncCardLang}
            onValueChange={(value) => setSyncCardLang(value ?? "en")}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t("cardImageVectors.languagePlaceholder")}>
                {LANGUAGE_LABELS[syncCardLang] ?? syncCardLang}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectedCardSource?.languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] ?? lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          placeholder={t("syncCardById.cardIdPlaceholder")}
          value={syncCardIdInput}
          onChange={(e) => setSyncCardIdInput(e.target.value)}
        />
        <Button
          disabled={
            !syncCardGameKey ||
            !syncCardIdInput.trim() ||
            syncCardMutation.isPending
          }
          onClick={() => syncCardMutation.mutate()}
        >
          {syncCardMutation.isPending
            ? t("syncCardById.syncingButton")
            : t("syncCardById.syncButton")}
        </Button>
      </div>
    </div>
  );
}
