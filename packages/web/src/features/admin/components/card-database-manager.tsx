import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrg } from "@/features/companies/api/use-organization";
import { listCards, revectorizeCard } from "@/lib/api/admin";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function CardDatabaseManager() {
  const { t } = useTranslation("admin");
  const { activeOrg } = useOrg();
  const [cardSearch, setCardSearch] = useState("");
  const [cardSearchInput, setCardSearchInput] = useState("");
  const [cardPage, setCardPage] = useState(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [revectorizingIds, setRevectorizingIds] = useState<Set<string>>(
    new Set(),
  );

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
    }, SEARCH_DEBOUNCE_MS);
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

  return (
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
          <div key={card.cardId} className="flex items-center gap-3 px-4 py-2">
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
  );
}
