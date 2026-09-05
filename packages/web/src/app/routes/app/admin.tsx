import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImpersonationUsersManager } from "@/features/admin/components/impersonation-users-manager";
import { AnnouncementsManager } from "@/features/announcements/components/announcements-manager";
import { useOrg } from "@/features/companies/api/use-organization";
import { GamesManager } from "@/features/games/components/games-manager";
import {
  cancelSync,
  createSyncEventSource,
  dumpCards,
  listCardGameKeys,
  listCards,
  listSyncSources,
  revectorizeCard,
  startSync,
  syncCardById,
} from "@/lib/api/admin";
import type { SyncState } from "@magic-vault/shared";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  DEFAULT_SYNC_STATE,
  formatDuration,
  LANGUAGE_LABELS,
  STATUS_COLORS,
} from "./admin.constants";

export default function AdminPage() {
  const { t } = useTranslation("admin");
  const { activeOrg } = useOrg();
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [now, setNow] = useState(() => Date.now());
  const [dumpOpen, setDumpOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [cardSearch, setCardSearch] = useState("");
  const [cardSearchInput, setCardSearchInput] = useState("");
  const [cardPage, setCardPage] = useState(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [revectorizingIds, setRevectorizingIds] = useState<Set<string>>(
    new Set(),
  );
  const [syncGameKey, setSyncGameKey] = useState<string | null>(null);
  const [syncLang, setSyncLang] = useState<string>("en");
  const [dumpGameKey, setDumpGameKey] = useState<string>("__all__");
  const [syncCardGameKey, setSyncCardGameKey] = useState<string | null>(null);
  const [syncCardLang, setSyncCardLang] = useState<string>("en");
  const [syncCardIdInput, setSyncCardIdInput] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["admin", "sync-sources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  const cardGamesQuery = useQuery({
    queryKey: ["admin", "cards", "games"],
    queryFn: () => listCardGameKeys().then((r) => r.data ?? []),
    staleTime: 30_000,
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    async function connect() {
      try {
        es = await createSyncEventSource();
        if (cancelled) {
          es.close();
          return;
        }

        es.addEventListener("status", (e: MessageEvent) => {
          setSyncState(JSON.parse(e.data) as SyncState);
        });

        es.addEventListener("progress", (e: MessageEvent) => {
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("done", (e: MessageEvent) => {
          const update = JSON.parse(e.data) as Partial<SyncState>;
          setSyncState((prev) => ({ ...prev, ...update }));
        });

        es.addEventListener("log", (e: MessageEvent) => {
          const { line } = JSON.parse(e.data) as { line: string };
          setSyncState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-199), line],
          }));
        });

        es.addEventListener("error", (e: MessageEvent) => {
          if (e.data) {
            const update = JSON.parse(e.data) as { message: string };
            setSyncState((prev) => ({
              ...prev,
              status: "failed",
              logs: [...prev.logs.slice(-199), `Error: ${update.message}`],
            }));
          }
        });
      } catch {}
    }

    connect();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);

  useEffect(() => {
    if (syncState.status !== "running") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [syncState.status]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [syncState.logs]);

  const cardsQuery = useQuery({
    queryKey: ["admin", "cards", cardPage, cardSearch],
    queryFn: () => listCards(cardPage, cardSearch).then((r) => r.data),
    staleTime: 30_000,
    enabled: !!activeOrg,
  });

  const totalPages = cardsQuery.data
    ? Math.max(1, Math.ceil(cardsQuery.data.total / cardsQuery.data.limit))
    : 1;

  function handleSearchInput(value: string) {
    setCardSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCardSearch(value);
      setCardPage(1);
    }, 300);
  }

  async function handleRevectorize(cardId: string, name: string) {
    setRevectorizingIds((prev) => new Set(prev).add(cardId));
    try {
      const result = await revectorizeCard(cardId);
      toast.success(result.message);
      cardsQuery.refetch();
    } catch {
      toast.error(t("toasts.revectorizeError", { name }));
    } finally {
      setRevectorizingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  }

  const startSyncMutation = useMutation({
    mutationFn: ({ gameKey, lang }: { gameKey: string; lang: string }) =>
      startSync(gameKey, lang),
  });
  const cancelSyncMutation = useMutation({ mutationFn: cancelSync });
  const syncCardMutation = useMutation({
    mutationFn: () =>
      syncCardById(syncCardGameKey!, syncCardIdInput.trim(), syncCardLang),
    onSuccess: (result) => {
      toast.success(result.message);
      setSyncCardIdInput("");
      cardsQuery.refetch();
      cardGamesQuery.refetch();
    },
    onError: () => {
      toast.error(t("toasts.syncCardError", { id: syncCardIdInput.trim() }));
    },
  });
  const dumpMutation = useMutation({
    mutationFn: (gameKey?: string) => dumpCards(gameKey),
    onSuccess: (result) => {
      setDumpOpen(false);
      toast.success(result.message);
      cardsQuery.refetch();
      cardGamesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("toasts.dumpError"));
    },
  });

  const total = syncState.total;
  const done = syncState.processed + syncState.skipped;
  const progress = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const elapsedMs = syncState.startedAt
    ? now - new Date(syncState.startedAt).getTime()
    : 0;
  const etaMs =
    done > 0 && total > done ? (elapsedMs / done) * (total - done) : null;
  const isRunning = syncState.status === "running";
  const selectedSource = sourcesQuery.data?.find(
    (s) => s.gameKey === syncGameKey,
  );
  const selectedCardSource = sourcesQuery.data?.find(
    (s) => s.gameKey === syncCardGameKey,
  );
  const selectedDumpGame = cardGamesQuery.data?.find(
    (g) => g.gameKey === dumpGameKey,
  );

  return (
    <div className="overflow-y-auto h-full w-full">
      <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4 ">
        <div>
          <h1 className="text-lg font-semibold font-heading">
            {t("page.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("page.subtitle")}</p>
        </div>

        <div className="flex flex-col flex-none">
          <div className="rounded-lg rounded-b-none border p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-medium">
                  {t("cardImageVectors.heading")}
                </p>
                <p
                  className="text-xs font-medium"
                  style={{ color: STATUS_COLORS[syncState.status] }}
                >
                  {t(`cardImageVectors.syncStatus.${syncState.status}`)}
                  {isRunning &&
                    ` — ${
                      sourcesQuery.data?.find(
                        (s) => s.gameKey === syncState.gameKey,
                      )?.label ?? syncState.gameKey
                    }${
                      syncState.lang !== "en"
                        ? ` (${LANGUAGE_LABELS[syncState.lang] ?? syncState.lang})`
                        : ""
                    }`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isRunning && (
                  <Select
                    value={syncGameKey}
                    onValueChange={(value) => {
                      setSyncGameKey(value);
                      const source = sourcesQuery.data?.find(
                        (s) => s.gameKey === value,
                      );
                      setSyncLang(source?.languages[0] ?? "en");
                    }}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue
                        placeholder={t(
                          "cardImageVectors.selectGamePlaceholder",
                        )}
                      >
                        {selectedSource?.label}
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
                )}
                {!isRunning && (selectedSource?.languages.length ?? 0) > 1 && (
                  <Select
                    value={syncLang}
                    onValueChange={(value) => setSyncLang(value ?? "en")}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue
                        placeholder={t("cardImageVectors.languagePlaceholder")}
                      >
                        {LANGUAGE_LABELS[syncLang] ?? syncLang}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectedSource?.languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGE_LABELS[lang] ?? lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {isRunning ? (
                  <Button
                    variant="outline"
                    disabled={cancelSyncMutation.isPending}
                    onClick={() => cancelSyncMutation.mutate()}
                  >
                    {cancelSyncMutation.isPending
                      ? t("cardImageVectors.cancellingButton")
                      : t("cardImageVectors.cancelButton")}
                  </Button>
                ) : (
                  <Button
                    disabled={
                      isRunning || startSyncMutation.isPending || !syncGameKey
                    }
                    onClick={() =>
                      startSyncMutation.mutate({
                        gameKey: syncGameKey!,
                        lang: syncLang,
                      })
                    }
                  >
                    {startSyncMutation.isPending
                      ? t("cardImageVectors.startingButton")
                      : t("cardImageVectors.startSyncButton")}
                  </Button>
                )}
              </div>
            </div>

            {total > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
                  <span>
                    {t("cardImageVectors.progressCount", { done, total })}
                  </span>
                  <span>
                    {t("cardImageVectors.vectorizedCount", {
                      count: syncState.processed,
                    })}
                  </span>
                  <span>
                    {t("cardImageVectors.skippedCount", {
                      count: syncState.skipped,
                    })}
                  </span>
                  {isRunning && etaMs !== null && (
                    <span>
                      {t("cardImageVectors.etaRemaining", {
                        duration: formatDuration(etaMs),
                      })}
                    </span>
                  )}
                  {syncState.errors > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      {t("cardImageVectors.errorsCount", {
                        count: syncState.errors,
                      })}
                    </span>
                  )}
                </div>
                {isRunning && syncState.currentCard && (
                  <p className="text-xs text-muted-foreground truncate">
                    {syncState.currentCard}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg rounded-t-none border border-t-0 overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">
                {t("log.heading")}
              </p>
            </div>
            <div
              ref={logRef}
              className="max-h-96 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5"
            >
              {syncState.logs.length > 0 ? (
                syncState.logs.map((line, i) => (
                  <p
                    key={i}
                    className="text-muted-foreground whitespace-pre-wrap break-all"
                  >
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap break-all">
                  {t("log.empty")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden flex flex-col flex-none h-96">
          <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-medium shrink-0">
                {t("cardDatabase.heading")}
              </p>
              {cardsQuery.data && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {t("cardDatabase.cardCount", {
                    count: cardsQuery.data.total,
                  })}
                </p>
              )}
            </div>
            <Input
              placeholder={t("cardDatabase.searchPlaceholder")}
              value={cardSearchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="h-7 text-xs max-w-48"
            />
          </div>

          <div className="divide-y min-h-0 overflow-y-auto">
            {cardsQuery.isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("cardDatabase.loading")}
              </p>
            )}
            {cardsQuery.isError && (
              <p className="text-sm text-destructive text-center py-6">
                {t("cardDatabase.loadError")}
              </p>
            )}
            {cardsQuery.data?.cards.map((card) => (
              <div
                key={card.cardId}
                className="flex items-center gap-3 px-4 py-2"
              >
                <p className="text-xs font-medium flex-1 min-w-0 truncate">
                  {card.name}
                </p>
                <p className="text-xs text-muted-foreground uppercase font-mono shrink-0">
                  {card.gameKey} · {card.setCode}
                  {card.lang !== "en" ? ` · ${card.lang}` : ""}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:block">
                  {new Date(card.updatedAt).toLocaleDateString()}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={revectorizingIds.has(card.cardId)}
                  onClick={() => handleRevectorize(card.cardId, card.name)}
                  title={t("cardDatabase.revectorizeTitle")}
                >
                  <IconRefresh
                    className={
                      revectorizingIds.has(card.cardId) ? "animate-spin" : ""
                    }
                  />
                </Button>
              </div>
            ))}
            {cardsQuery.data?.cards.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("cardDatabase.empty")}
              </p>
            )}
          </div>

          {cardsQuery.data && totalPages > 1 && (
            <div className="border-t px-4 py-2 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("cardDatabase.pageOf", {
                  page: cardPage,
                  total: totalPages,
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={cardPage <= 1}
                  onClick={() => setCardPage((p) => p - 1)}
                >
                  <IconChevronLeft />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={cardPage >= totalPages}
                  onClick={() => setCardPage((p) => p + 1)}
                >
                  <IconChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>

        <ImpersonationUsersManager />

        <AnnouncementsManager />

        <GamesManager />

        <div className="rounded-lg border p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium">{t("syncCardById.heading")}</p>
            <p className="text-sm text-muted-foreground">
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
                <SelectValue
                  placeholder={t("cardImageVectors.selectGamePlaceholder")}
                >
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
                  <SelectValue
                    placeholder={t("cardImageVectors.languagePlaceholder")}
                  >
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

        <div className="rounded-lg border p-4 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-sm font-medium">{t("dumpDatabase.heading")}</p>
            <p className="text-sm text-muted-foreground">
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
      </div>
    </div>
  );
}
